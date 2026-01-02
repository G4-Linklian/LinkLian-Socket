import { Request } from "express";
import { JwtPayload } from "./auth.interface";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}