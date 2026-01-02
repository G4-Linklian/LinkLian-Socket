import { Request, Response } from "express";
import { queryPostgresDB, globalSmartGISConfig } from "../config/db";
import { CreateUserPayload, UserFields } from "../interface/user.interface";
import { generateInitialPassword } from "../support/passwordGenerator";
import { hashPassword } from "../support/passwordHashing";
import { sendInitialPasswordEmail } from "../support/mailerSending";

/* CREATE USER */
export const createUser = async (
  req: Request<{}, {}, CreateUserPayload>,
  res: Response
) => {
  const rawPassword = generateInitialPassword();
  const hashedPassword = await hashPassword(rawPassword);

const query = `
  INSERT INTO user_sys (
    email,
    password,
    first_name,
    middle_name,
    last_name,
    phone,
    role_id,
    code,
    edu_lev_id,
    institution_id,
    last_login,
    flag_valid,
    created_at,
    updated_at
  )
  VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10,
    NULL, false, NOW(), NOW()
  )
`;


const values = [
  req.body.email,
  hashedPassword,
  req.body.first_name,
  req.body.middle_name ?? null,
  req.body.last_name,
  req.body.phone ?? null,
  req.body.role_id,
  req.body.code,
  req.body.edu_lev_id,
  req.body.institution_id,
];


  try {
    await queryPostgresDB(query, globalSmartGISConfig, values);
    await sendInitialPasswordEmail(req.body.email, rawPassword);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

export const getUser = async (
  req: Request<{}, {}, UserFields>,
  res: Response
) => {
  const {
    user_sys_id,
    email,
    password,
    first_name,
    middle_name,
    last_name,
    phone,
    role_id,
    code,
    edu_lev_id,
    institution_id,
    flag_valid,
    created_at,
    updated_at,
  } = req.body;

  if (
    !user_sys_id &&
    !email &&
    !first_name &&
    !middle_name &&
    !last_name &&
    !phone &&
    !role_id &&
    !code &&
    !edu_lev_id &&
    !created_at &&
    !updated_at &&
    flag_valid === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "No value input!",
    });
  }

  let query = `SELECT * FROM user_sys u WHERE 1=1 \n`;
  const values: any[] = [];
  let index = 1;

  if (user_sys_id) { query += `AND u.user_sys_id = $${index++}\n`; values.push(user_sys_id); }
  if (email)       { query += `AND u.email = $${index++}\n`; values.push(email); }
  if (first_name)  { query += `AND u.first_name = $${index++}\n`; values.push(first_name); }
  if (middle_name) { query += `AND u.middle_name = $${index++}\n`; values.push(middle_name); }
  if (last_name)   { query += `AND u.last_name = $${index++}\n`; values.push(last_name); }
  if (phone)       { query += `AND u.phone = $${index++}\n`; values.push(phone); }
  if (role_id)     { query += `AND u.role_id = $${index++}\n`; values.push(role_id); }
  if (code)        { query += `AND u.code = $${index++}\n`; values.push(code); }
  if (edu_lev_id)  { query += `AND u.edu_lev_id = $${index++}\n`; values.push(edu_lev_id); }
  if (created_at)  { query += `AND u.created_at = $${index++}\n`; values.push(created_at); }
  if (updated_at)  { query += `AND u.updated_at = $${index++}\n`; values.push(updated_at); }
  if (flag_valid !== undefined) {
    query += `AND u.flag_valid = $${index++}\n`;
    values.push(flag_valid);
  }

  try {
    const data = await queryPostgresDB(query, globalSmartGISConfig, values);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error fetching user" });
  }
};
