import express from "express";
import { getUser } from "../logic/user"

const router = express.Router();

// User Sys
router.post("/users.get", getUser);

export default router;
