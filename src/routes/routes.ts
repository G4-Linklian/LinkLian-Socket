import express from "express";
import multer from "multer";
// import { getRole, createRole, updateRole } from "../logic/role"

import { getInstitution, createInstitution, updateInstitution, loginInstitution } from "../logic/institution";
import { 
    getUserSys,
    createUserSys,
    updateUserSys
} from "../logic/user_sys";
import { getRole, createRole, updateRole } from "../logic/role";

import { 
    getLearningArea, 
    createLearningArea, 
    updateLearningArea, 
    createLearningAreaUserSys,
    updateLearningAreaUserSys,
} from "../logic/learningArea";

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
import { createProgram, getProgram, updateProgram, updateProgramUserSys } from "../logic/program";
import {
    getEduLevelMaster,
    getEduLevel,
    createEduLevelNorm,
    deleteEduLevelNorm
} from "../logic/eduLevel";

import { resetPassword, verifyAuthContext,resendOTP ,forgotPassword, login, verifyOTP } from "../logic/auth";
import { authenticate } from "../middlewares/authen";
import { AuthenticatedRequest } from "../interface/request.interface";
import { createUser, getUser } from "../logic/user";
import  { uploadFiles, deleteFiles } from "../logic/fileStorage";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Role Routes
router.post("/role.get", getRole);
router.post("/role.create", createRole);
router.post("/role.update", updateRole);

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
router.post("/program.usersys.update", updateProgramUserSys);

// Learning Area Routes
router.post("/learning.area.get", getLearningArea);
router.post("/learning.area.create", createLearningArea);
router.post("/learning.area.usersys.create", createLearningAreaUserSys);
router.post("/learning.area.usersys.update", updateLearningAreaUserSys);
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


// UserSys Routes
router.post("/usersys.get", getUserSys);
router.post("/usersys.create", createUserSys);
router.post("/usersys.update", updateUserSys);


// Auth Routes
router.post("/auth.verify", verifyAuthContext);
router.post("/auth.reset-password", resetPassword);
router.post("/auth.forgot-password", forgotPassword);
router.post("/auth.login", login); 
router.post("/auth.verify-otp", verifyOTP);
router.post("/auth.resend-otp", resendOTP);

// File Storage Routes
router.post("/uploadFile/:containerName/:folderName", upload.array('files', 10), uploadFiles);
router.delete("/deleteFile/:containerName", deleteFiles);

export default router;