import bcrypt from "bcryptjs";
import { globalSmartGISConfig, queryPostgresDB } from "../config/db";


export const hashPasswordWithSalt = async (plainPassword: string) => {
  const saltNumber = process.env.SALTNUMBER
  const combined = plainPassword + saltNumber;
  const hashed = await bcrypt.hash(combined, 10);
  return hashed
};

export const verifyPasswordWithSalt = async (plainPassword: string, hashedPassword: string) => {
  const saltNumber = process.env.SALTNUMBER;
  const combined = plainPassword + saltNumber;
  const isMatch = await bcrypt.compare(combined, hashedPassword);
  return isMatch;
};

export const JWTToken = async (userData: any, jwt: any) => {
    const token = jwt.sign(userData, process.env.JWT_SECRET as string, {
        expiresIn: process.env.TOKEN_EXPIRES_IN || "30d",
    });
    return token;
}

export const emailInstChecker = async (email: string) => {
    const query = `
        SELECT inst_email FROM institution WHERE inst_email = $1
    `;
    const values = [email];

    const result = await queryPostgresDB(query, globalSmartGISConfig, values);

    if (result.length > 0) {
        return true;
    } else {
        return false;
    }
}

