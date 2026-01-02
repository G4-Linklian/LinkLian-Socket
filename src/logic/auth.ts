import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { queryPostgresDB, globalSmartGISConfig } from "../config/db";
import { JwtPayload } from "../interface/auth.interface";
import { generateToken } from "../middlewares/authen";
import { generateOTP } from "../support/generateOTP";
import { sendOTPEmail } from "../support/mailerSending";
import { v4 as uuidv4 } from "uuid";
import {
  saveOtpSession,
  getOtpSession,
  markOtpUsed,
  deleteOtpSession,
} from "../support/otpStore";

const JWT_SECRET = process.env.JWT_SECRET!;

export const verifyAuthContext = async (
  req: Request<{}, {}, { token?: string }>,
  res: Response
) => {
  const { token } = req.body;

  // guard clause (pattern เดียวกับ role)
  if (!token) {
    return res.status(400).json({
      success: false,
      message: "No value input!",
    });
  }

  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  /**
   * OPTIONAL: re-check role from DB
   * ใช้ในกรณี role อาจถูก disable
   */
  const roleCheck = await queryPostgresDB(
    `
    SELECT role_name, flag_valid
    FROM role
    WHERE role_id = $1
    LIMIT 1
    `,
    globalSmartGISConfig,
    [payload.role_id]
  );

  if (roleCheck.length === 0 || !roleCheck[0].flag_valid) {
    return res.status(403).json({
      success: false,
      message: "Role is disabled",
    });
  }

  /**
   * ส่งข้อมูล “สำหรับแสดงผล” เท่านั้น
   */
  return res.status(200).json({
    success: true,
    data: {
      user_id: payload.user_id,
      username: payload.username,
      role_id: payload.role_id,
      role_name: payload.role_name,
      access: payload.access,

    },
  });
};

export const loginInitial = async (
  req: Request<{}, {}, { email?: string; password?: string }>,
  res: Response
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "No value input!",
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
    const data = await queryPostgresDB(query, globalSmartGISConfig, [email]);

    if (data.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = data[0];

    // ❗ ถ้าเคย reset แล้ว ไม่ควรใช้ initial อีก
    if (user.flag_valid === true) {
      return res.status(403).json({
        success: false,
        message: "Initial password already used",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    return res.status(200).json({
      success: true,
      message: "First time login success. Please reset password.",
    });

  } catch (error) {
    console.error("loginInitial error:", error);
    return res.status(500).json({
      success: false,
      message: "Initial login failed",
    });
  }
};

export const login = async (
  req: Request<{}, {}, { email?: string; password?: string }>,
  res: Response
) => {
  const { email, password } = req.body;

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

    // ❗ role disable
    if (!user.role_valid) {
      return res.status(403).json({
        success: false,
        message: "Role is disabled",
      });
    }

    // 🔑 ยังไม่ reset password
    if (user.user_valid === false) {
      return res.status(200).json({
        success: true,
        require_reset_password: true,
      });
    }

    // 🔐 check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ ทุก login ต้อง OTP
    const otp = generateOTP();
    const otpSessionId = uuidv4();

    saveOtpSession(otpSessionId, {
      user_id: user.user_sys_id,
      otp,
      expires_at: Date.now() + 2 * 60 * 1000,
      used: false,
    });

    await sendOTPEmail(user.email, otp);

    return res.status(200).json({
      success: true,
      require_otp: true,
      otp_session_id: otpSessionId, // frontend ส่งต่อไป verify
    });

  } catch (error) {
    console.error("Auth login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};


export const verifyOTP = async (
  req: Request<{}, {}, { otp?: string; otp_session_id?: string }>,
  res: Response
) => {
  const { otp, otp_session_id } = req.body;

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

// 🔥 ดึงข้อมูล user + role ใหม่จาก DB
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


  const token = generateToken(payload);

  return res.status(200).json({
    success: true,
    token,
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

  // ===== Guard: input =====
  if (!email || !password || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  // ===== Guard: new password match =====
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

    // ===== Guard: already reset =====
    if (user.flag_valid === true) {
      return res.status(400).json({
        success: false,
        message: "Password already reset",
      });
    }

    // ===== Guard: check old password =====
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Initial password incorrect",
      });
    }

    // ===== Update password =====
    const hashedPassword = await bcrypt.hash(new_password, 10);

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
      [hashedPassword, user.user_sys_id]
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

