import express from "express";
// import { getRole, createRole, updateRole } from "../logic/role"
import { loginInitial, resetPassword, verifyAuthContext } from "../logic/auth";
import { authenticate } from "../middlewares/authen";
import { AuthenticatedRequest } from "../interface/request.interface";
import { createUser, getUser } from "../logic/user";
import { login } from "../logic/auth";
import { verifyOTP } from "../logic/auth";

const router = express.Router();

// // Role Routes
// router.post("/role.get", getRole);
// router.post("/role.create", createRole);
// router.post("/role.update", updateRole);

//User Routes
router.post("/user.create", createUser);
router.post("/user.get", getUser);


// Auth Routes
router.post("/auth.verify", verifyAuthContext);
router.post("/auth.login-initial", loginInitial);
router.post("/auth.reset-password", resetPassword);
router.post("/auth.login", login); // ✅ เพิ่ม
router.post("/auth.verify-otp", verifyOTP);


/**
 * ใช้แค่ตรวจว่า token ใช้ได้หรือไม่
 */
router.post(
  "/auth.test",
  authenticate(), // ไม่ส่ง resource/action
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      success: true,
      message: "Token is valid",
      user: req.user, // payload จาก JWT
    });
  }
);

router.post(
  "/assignment.update",
  authenticate("assignment_manage", "update"),
  (req, res) => {
    res.json({ success: true, message: "Update allowed" });
  }
);

export default router;