import express from "express";
import { getUser } from "../logic/user"
import { getRole, createRole, updateRole } from "../logic/role"

const router = express.Router();

// Role Routes
router.post("/role.get", getRole);
router.post("/role.create", createRole);
router.post("/role.update", updateRole);

export default router;
