import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { queryPostgresDB, globalSmartGISConfig } from "../config/db";
import { JwtPayload } from "../interface/auth.interface";
import { generateToken } from "../middlewares/authen";
import { sendOTPEmail , sendInitialPasswordEmail } from "../utils/mailerSending";
import { generateInitialPassword } from "../utils/passwordGenerator";
import { v4 as uuidv4 } from "uuid";
import {
  verifyPasswordWithSalt,
  hashPasswordWithSalt,
  generateOTP,
} from "../utils/auth.function";
import {
  saveOtpSession,
  getOtpSession,
  markOtpUsed,
  deleteOtpSession,
} from "../utils/otpStore";

const USER_GROUP_ROLE_MAP: Record<string, string[]> = {
  student: ["high school student", "uni student"],
  teacher: ["teacher", "instructor"],
};

const JWT_SECRET = process.env.JWT_SECRET!;


//ตรวจข้อมูลความพร้อมของ user เข่น Token , reset password y/n? , user valid y/n?
//using route auth.verify
export const verifyAuthContext = async (
  req: Request,
  res: Response
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
  const userCheck = await queryPostgresDB(
    `
  SELECT flag_valid
  FROM user_sys
  WHERE user_sys_id = $1
  LIMIT 1
  `,
    globalSmartGISConfig,
    [payload.user_id]
  );

  if (userCheck.length === 0) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  if (!userCheck[0].flag_valid) {
    return res.status(403).json({
      success: false,
      message: "Password not reset",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      user_id: Number(payload.user_id), // 🔥 บังคับ type
      username: payload.username,
      role_id: payload.role_id,
      role_name: payload.role_name,
      access: payload.access,
    },
  });
};


export const login = async (
  req: Request<
    {},
    {},
    {
      email?: string;
      password?: string;
      user_group?: "student" | "teacher";
      remember_me?: boolean;

    }
  >,
  res: Response
) => {
  const { email, password, user_group, remember_me } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "No value input!",
    });
  }

  const query = `
    SELECT
      u.user_sys_id,
      u.email,
      u.password,
      u.role_id,
      r.role_name,
      r.access,
      u.flag_valid AS user_valid,
      r.flag_valid AS role_valid
    FROM user_sys u
    JOIN role r ON r.role_id = u.role_id
    WHERE u.email = $1
    LIMIT 1
  `;

  try {
    const data = await queryPostgresDB(query, globalSmartGISConfig, [email]);

    if (data.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = data[0];

    if (user_group) {
      const allowedRoles = USER_GROUP_ROLE_MAP[user_group];

      if (!allowedRoles) {
        return res.status(400).json({
          success: false,
          message: "Invalid user group",
        });
      }

      if (!allowedRoles.includes(user.role_name)) {
        return res.status(403).json({
          success: false,
          message: "Role mismatch",
        });
      }
    }

    // Role ถูกปิดใช้งาน เป็น False
    if (!user.role_valid) {
      return res.status(403).json({
        success: false,
        message: "Role is disabled",
      });
    }

    // ยังไม่ reset password ส่ง require_reset_password ไปหน้าบ้านเพื่อเรียก bottom sheet ให่้ reset 
    //ใช้ Flag valid กำหนด
    if (user.user_valid === false) {
      return res.status(200).json({
        success: true,
        require_reset_password: true,
      });
    }
    // /* ===== PASSWORD CHECK (WITH SALT) ===== */
    // const passwordMatch = await verifyPasswordWithSalt(
    //   password,
    //   user.password
    // );

    // if (!passwordMatch) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Invalid credentials",
    //   });
    // }


    // check password ผ่านแล้ว
    const otp = generateOTP();
    const otpSessionId = uuidv4();

    saveOtpSession(otpSessionId, {
      user_id: user.user_sys_id,
      otp,
      expires_at: Date.now() + 2 * 60 * 1000, //2 mins
      used: false,
    });

    await sendOTPEmail(user.email, otp);

    return res.status(200).json({
      success: true,
      require_otp: true,
      otp_session_id: otpSessionId, //ส่งไปเก็บใน memory เพื่อตรวจว่าที่กรอกมาถูกไหม
      remember_me: remember_me === true, // 🔥 ส่งต่อ

    });

  } catch (error) {
    console.error("Auth login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// ตรวจความถูกต้อง OTP
export const verifyOTP = async (
  req: Request<{}, {}, { otp?: string; otp_session_id?: string; remember_me?: boolean }>,
  res: Response
) => {
  const { otp, otp_session_id, remember_me } = req.body;

  if (!otp || !otp_session_id) {
    return res.status(400).json({
      success: false,
      message: "Missing OTP or session",
    });
  }

  const session = getOtpSession(otp_session_id);

  if (!session) {
    return res.status(401).json({
      success: false,
      message: "OTP expired or invalid",
    });
  }

  if (session.used) {
    return res.status(400).json({
      success: false,
      message: "OTP already used",
    });
  }

  if (Date.now() > session.expires_at) {
    deleteOtpSession(otp_session_id);
    return res.status(401).json({
      success: false,
      message: "OTP expired",
    });
  }

  if (session.otp !== otp) {
    return res.status(401).json({
      success: false,
      message: "Invalid OTP",
    });
  }

  // ✅ OTP ผ่าน
  markOtpUsed(otp_session_id);
  deleteOtpSession(otp_session_id);

  // update last_login
  await queryPostgresDB(
    `UPDATE user_sys SET last_login = NOW() WHERE user_sys_id = $1`,
    globalSmartGISConfig,
    [session.user_id]
  );

  // ดึงข้อมูล user + role ใหม่จาก DB
  const userRows = await queryPostgresDB(
    `
  SELECT
    u.user_sys_id,
    u.email,
    u.role_id,
    r.role_name,
    r.access
  FROM user_sys u
  JOIN role r ON r.role_id = u.role_id
  WHERE u.user_sys_id = $1
  LIMIT 1
  `,
    globalSmartGISConfig,
    [session.user_id]
  );
  const user = userRows[0];

  // generate token ครั้งเดียวตรงนี้
  const payload: JwtPayload = {
    user_id: user.user_sys_id,
    username: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
    access: user.access,
    otp_verified: true,
  };

  const expiresIn = remember_me ? "30d" : "15d"; // 🔥 หัวใจของระบบ

  const token = generateToken(payload, expiresIn);

  return res.status(200).json({
    success: true,
    token,
    user_id: user.user_sys_id, //ส่งไปหน้าบ้านกัน Email เดิมเเต่ login เข้าใหม่ครั้งเเรกใช้ Token เดิม
  });
};

export const resendOTP = async (
  req: Request<{}, {}, { otp_session_id?: string }>,
  res: Response
) => {
  const { otp_session_id } = req.body;

  if (!otp_session_id) {
    return res.status(400).json({
      success: false,
      message: "Missing otp session",
    });
  }

  const oldSession = getOtpSession(otp_session_id);

  if (!oldSession) {
    return res.status(401).json({
      success: false,
      message: "OTP session expired",
    });
  }

  // ❌ invalidate old session
  deleteOtpSession(otp_session_id);

  // ✅ generate new OTP + session
  const newOtp = generateOTP();
  const newSessionId = uuidv4();

  saveOtpSession(newSessionId, {
    user_id: oldSession.user_id,
    otp: newOtp,
    expires_at: Date.now() + 2 * 60 * 1000,
    used: false,
  });

  // 🔥 ดึง email user
  const rows = await queryPostgresDB(
    `SELECT email FROM user_sys WHERE user_sys_id = $1 LIMIT 1`,
    globalSmartGISConfig,
    [oldSession.user_id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  await sendOTPEmail(rows[0].email, newOtp);

  return res.status(200).json({
    success: true,
    otp_session_id: newSessionId,
  });
};

export const resetPassword = async (
  req: Request<{}, {}, {
    email?: string;
    password?: string;
    new_password?: string;
    confirm_password?: string;
  }>,
  res: Response
) => {
  const { email, password, new_password, confirm_password } = req.body;

  if (!email || !password || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match",
    });
  }

  const query = `
    SELECT
      user_sys_id,
      password,
      flag_valid
    FROM user_sys
    WHERE email = $1
    LIMIT 1
  `;

  try {
    const data = await queryPostgresDB(
      query,
      globalSmartGISConfig,
      [email]
    );

    if (data.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const user = data[0];

    if (user.flag_valid === true) {
      return res.status(400).json({
        success: false,
        message: "Password already reset",
      });
    }


    const match = await verifyPasswordWithSalt(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Initial password incorrect",
      });
    }

    const hashed = await hashPasswordWithSalt(new_password);

    await queryPostgresDB(
      `
      UPDATE user_sys
      SET
        password = $1,
        flag_valid = true,
        updated_at = NOW()
      WHERE user_sys_id = $2
      `,
      globalSmartGISConfig,
      [hashed, user.user_sys_id]
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });

  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Reset password failed",
    });
  }
};


export const forgotPassword = async (
  req: Request<{}, {}, { email?: string }>,
  res: Response
) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  try {
    // 1️⃣ check user
    const users = await queryPostgresDB(
      `
      SELECT user_sys_id, flag_valid
      FROM user_sys
      WHERE email = $1
      LIMIT 1
      `,
      globalSmartGISConfig,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    const user = users[0];

    // 2️⃣ generate temporary password
    const tempPassword = generateInitialPassword();
const hashedPassword = await hashPasswordWithSalt(tempPassword);
    // 3️⃣ update password + force reset
    await queryPostgresDB(
      `
      UPDATE user_sys
      SET
        password = $1,
        flag_valid = false,
        updated_at = NOW()
      WHERE user_sys_id = $2
      `,
      globalSmartGISConfig,
      [hashedPassword, user.user_sys_id]
    );

    // 4️⃣ send email
    await sendInitialPasswordEmail(email, tempPassword);

    return res.status(200).json({
      success: true,
      message: "Temporary password has been sent to your email",
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Forgot password failed",
    });
  }
};
