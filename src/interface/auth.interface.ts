export interface AccessActions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface RoleAccess {
  [resource: string]: AccessActions;
}

export interface JwtPayload {
  user_id: number;
  username: string;
  role_id: number;
  role_name: string;
  access: RoleAccess;
  otp?: string;            // 👈 เพิ่ม
  otp_verified?: boolean;  // 👈 เพิ่ม
  otp_session_id?: string; // 👈 เพิ่ม
  iat?: number;
  exp?: number;
}