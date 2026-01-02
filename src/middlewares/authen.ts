import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { AuthenticatedRequest } from "../interface/request.interface";
import { JwtPayload } from "../interface/auth.interface";
import type { StringValue } from "ms";


/* ===== ENV CHECK ===== */
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const JWT_SECRET: Secret = process.env.JWT_SECRET;
const TOKEN_EXPIRES_IN: StringValue =
  (process.env.TOKEN_EXPIRES_IN as StringValue) || "30d";

/* ===== TOKEN GENERATOR ===== */
export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: TOKEN_EXPIRES_IN,
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

/* ===== AUTH MIDDLEWARE ===== */
export const authenticate =
  (
    resource?: string,
    action?: "read" | "create" | "update" | "delete"
  ) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing token" });
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (typeof decoded !== "object" || decoded === null) {
        return res.status(401).json({ message: "Invalid token payload" });
      }

      const payload = decoded as JwtPayload;

      // 🔐 RBAC check
      if (resource && action) {
        const hasPermission =
          payload.access?.[resource]?.[action] === true;

        if (!hasPermission) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      console.log(
        `[AUTH] Token valid | user=${payload.username} | role=${payload.role_name}`
      );

      req.user = payload;
      next();
    } catch {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }
  };
