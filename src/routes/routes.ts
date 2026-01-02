import express from "express";
// import { getRole, createRole, updateRole } from "../logic/role"

import { getInstitution, createInstitution, updateInstitution, loginInstitution } from "../logic/institution";

import { getProgramHighschool, createProgramHighschool, updateProgramHighschool } from "../logic/programHighschool";
import { getProgramUniversity, createProgramUniversity, updateProgramUniversity } from "../logic/programUniversity";
import { getLearningArea, createLearningArea, updateLearningArea } from "../logic/learningArea";

import { getSubject, createSubject, updateSubject } from "../logic/subject";
import { getSemester, createSemester, updateSemester } from "../logic/semester";
import { getRoomLocation, createRoomLocation, updateRoomLocation } from "../logic/roomLocation";


import {
    getSectionMaster,
    getSectionEducator,
    getSectionEnrollment,
    createSection,
    createSectionEducator,
    createSectionEnrollment,
    updateSection,
    updateSectionEducator,
    updateSectionEnrollment,
    deleteSection,
    deleteSectionEducator,
    deleteSectionEnrollment
} from "../logic/section";

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

// Section Routes
router.post("/section.master.get", getSectionMaster);
router.post("/section.educator.get", getSectionEducator);
router.post("/section.enrollment.get", getSectionEnrollment);

router.post("/section.create", createSection);
router.post("/section.educator.create", createSectionEducator);
router.post("/section.enrollment.create", createSectionEnrollment);

router.post("/section.update", updateSection);
router.post("/section.educator.update", updateSectionEducator);
router.post("/section.enrollment.update", updateSectionEnrollment);

router.post("/section.delete", deleteSection);
router.post("/section.educator.delete", deleteSectionEducator);
router.post("/section.enrollment.delete", deleteSectionEnrollment);


// Institution Routes
router.post("/institution.get", getInstitution);
router.post("/institution.create", createInstitution);
router.post("/institution.update", updateInstitution);
router.post("/institution.login", loginInstitution);

// Program Highschool Routes
router.post("/programHighschool.get", getProgramHighschool);
router.post("/programHighschool.create", createProgramHighschool);
router.post("/programHighschool.update", updateProgramHighschool);

// Program University Routes
router.post("/programUniversity.get", getProgramUniversity);
router.post("/programUniversity.create", createProgramUniversity);
router.post("/programUniversity.update", updateProgramUniversity);

// Learning Area Routes
router.post("/learningArea.get", getLearningArea);
router.post("/learningArea.create", createLearningArea);
router.post("/learningArea.update", updateLearningArea);

// Subject Routes
router.post("/subject.get", getSubject);
router.post("/subject.create", createSubject);
router.post("/subject.update", updateSubject);

// Semester Routes
router.post("/semester.get", getSemester);
router.post("/semester.create", createSemester);
router.post("/semester.update", updateSemester);

// Room Location Routes
router.post("/roomLocation.get", getRoomLocation);
router.post("/roomLocation.create", createRoomLocation);
router.post("/roomLocation.update", updateRoomLocation);


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