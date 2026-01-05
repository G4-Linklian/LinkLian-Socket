import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { UserSysFields } from '../interface/userSys.interface';

export const getUserSys = async (req: Request<{}, {}, UserSysFields>, res: Response) => {

    const {
        user_sys_id,
        email,
        first_name, 
        middle_name,
        last_name,
        phone,
        role_id,
        code,
        edu_lev_id,
        inst_id,
        flag_valid,
        status,
        profile_pic,
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
        !inst_id &&
        !(typeof flag_valid === "boolean") &&
        !status &&
        !profile_pic
    ) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM user_sys u \n';
    query += 'WHERE 1=1 \n';

    const values: any[] = [];
    let index = 1;

    if (user_sys_id) {
        query += ` AND u.user_sys_id = $${index++}`;
        values.push(user_sys_id);
    }

    if (email) {
        query += ` AND u.email = $${index++}`;
        values.push(email);
    }

    if (first_name) {
        query += ` AND u.first_name = $${index++}`;
        values.push(first_name);
    }

    if (middle_name) {
        query += ` AND u.middle_name = $${index++}`;
        values.push(middle_name);
    }

    if (last_name) {
        query += ` AND u.last_name = $${index++}`;
        values.push(last_name);
    }

    if (phone) {
        query += ` AND u.phone = $${index++}`;
        values.push(phone);
    }

    if (role_id) {
        query += ` AND u.role_id = $${index++}`;
        values.push(role_id);
    }

    if (code) {
        query += ` AND u.code = $${index++}`;
        values.push(code);
    }

    if (edu_lev_id) {
        query += ` AND u.edu_lev_id = $${index++}`;
        values.push(edu_lev_id);
    }

    if (inst_id) {
        query += ` AND u.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND u.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    if (status) {
        query += ` AND u.status = $${index++}`;
        values.push(status);
    }

    if (profile_pic) {
        query += ` AND u.profile_pic = $${index++}`;
        values.push(profile_pic);
    }

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    }

    catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};