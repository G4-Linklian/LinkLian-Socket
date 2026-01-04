import express from "express";
import multer from "multer";
// import { getRole, createRole, updateRole } from "../logic/role"

import { getInstitution, createInstitution, updateInstitution, loginInstitution } from "../logic/institution";

import { getProgramHighschool, createProgramHighschool, updateProgramHighschool } from "../logic/programHighschool";
import { getProgramUniversity, createProgramUniversity, updateProgramUniversity } from "../logic/programUniversity";
import { getLearningArea, createLearningArea, updateLearningArea } from "../logic/learningArea";

import { getSubject, createSubject, updateSubject } from "../logic/subject";
import { getSemester, createSemester, updateSemester } from "../logic/semester";
import {
    getBuilding,
    createBuilding,
    updateBuilding,
    getRoomLocation,
    createRoomLocation,
    createRoomLocationBatch,
    updateRoomLocation,
    deleteRoomLocation
} from "../logic/building";

import {
    getSectionMaster,
    getSection,
    getSectionEducator,
    getSectionEnrollment,
    createSection,
    createSectionSchedule,
    createSectionEducator,
    createSectionEnrollment,
    updateSection,
    updateSectionEducator,
    updateSectionEnrollment,
    updateSectionSchedule,
    deleteSection,
    deleteSectionEducator,
    deleteSectionEnrollment,

    createSchedule,

    getSchedule,

} from "../logic/section";
import { createProgram, getProgram, updateProgram } from "../logic/program";
import {
    getEduLevelMaster,
    getEduLevel,
    createEduLevelNorm,
    deleteEduLevelNorm
} from "../logic/eduLevel";

import { loginInitial, resetPassword, verifyAuthContext } from "../logic/auth";
import { authenticate } from "../middlewares/authen";
import { AuthenticatedRequest } from "../interface/request.interface";
import { createUser, getUser } from "../logic/user";
import { login } from "../logic/auth";
import { verifyOTP } from "../logic/auth";
import  { uploadFiles, deleteFiles } from "../logic/fileStorage";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Role Routes
// router.post("/role.get", getRole);
// router.post("/role.create", createRole);
// router.post("/role.update", updateRole);

// Section Routes
router.post("/section.master.get", getSectionMaster);
router.post("/section.get", getSection);
router.post("/section.educator.get", getSectionEducator);
router.post("/section.enrollment.get", getSectionEnrollment);

router.post("/section.create", createSection);
router.post("/section.schedule.create", createSectionSchedule);
router.post("/section.educator.create", createSectionEducator);
router.post("/section.enrollment.create", createSectionEnrollment);

router.post("/section.update", updateSection);
router.post("/section.educator.update", updateSectionEducator);
router.post("/section.enrollment.update", updateSectionEnrollment);
router.post("/section.schedule.update", updateSectionSchedule);

router.post("/section.delete", deleteSection);
router.post("/section.educator.delete", deleteSectionEducator);
router.post("/section.enrollment.delete", deleteSectionEnrollment);

// Section Schedule Routes
router.post("/schedule.create", createSchedule);
router.post("/schedule.get", getSchedule);


// Institution Routes
router.post("/institution.get", getInstitution);
router.post("/institution.create", createInstitution);
router.post("/institution.update", updateInstitution);
router.post("/institution.login", loginInstitution);

// Program Routes
router.post("/program.get", getProgram);
router.post("/program.create", createProgram);
router.post("/program.update", updateProgram);

// Learning Area Routes
router.post("/learning.area.get", getLearningArea);
router.post("/learning.area.create", createLearningArea);
router.post("/learning.area.update", updateLearningArea);

// Subject Routes
router.post("/subject.get", getSubject);
router.post("/subject.create", createSubject);
router.post("/subject.update", updateSubject);

// Semester Routes
router.post("/semester.get", getSemester);
router.post("/semester.create", createSemester);
router.post("/semester.update", updateSemester);

// Building & Room Location Routes
router.post("/building.get", getBuilding);
router.post("/building.create", createBuilding);
router.post("/building.update", updateBuilding);

router.post("/room.location.get", getRoomLocation);
router.post("/room.location.create", createRoomLocation);
router.post("/room.location.create.batch", createRoomLocationBatch);
router.post("/room.location.update", updateRoomLocation);
router.post("/room.location.delete", deleteRoomLocation);

// EduLevel Routes
router.post("/edu.level.master.get", getEduLevelMaster);
router.post("/edu.level.get", getEduLevel);
router.post("/edu.level.norm.create", createEduLevelNorm);
router.post("/edu.level.norm.delete", deleteEduLevelNorm);


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
// File Storage Routes
router.post("/uploadFile/:containerName/:folderName", upload.array('files', 10), uploadFiles);
router.delete("/deleteFile/:containerName", deleteFiles);

export default router;