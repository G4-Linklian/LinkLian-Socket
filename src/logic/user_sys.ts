import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { UserSysFields } from '../interface/userSys.interface';
import { CreateUserPayload, UserFields } from "../interface/user.interface";
import { generateInitialPassword } from "../utils/passwordGenerator";
import { hashPasswordWithSalt } from "../utils/auth.function";
import { sendInitialPasswordEmail } from "../utils/mailerSending";
import { createLearningAreaUserSysFunc } from '../logic/learningArea';
import { createProgramUserSysFunc } from '../logic/program';


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
        user_status,
        offset,
        limit,
        sort_by,
        sort_order,
        learning_area_id,
        keyword
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
        !keyword &&
        !(typeof flag_valid === "boolean") &&
        !user_status
    ) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;


    query += 'SELECT *, COUNT(*) OVER() as total_count FROM user_sys u \n';
    query += 'LEFT JOIN role r ON u.role_id = r.role_id \n';
    if (role_id === 4 || role_id === 5) {
        query += 'LEFT JOIN user_sys_learning_area_normalize uslan ON u.user_sys_id = uslan.user_sys_id \n';
        query += 'LEFT JOIN learning_area la ON uslan.learning_area_id = la.learning_area_id \n';
    } else if (role_id === 2 || role_id === 3) {
        query += 'LEFT JOIN user_sys_program_normalize uspn ON u.user_sys_id = uspn.user_sys_id \n';
        query += "LEFT JOIN program p ON uspn.program_id = p.program_id AND p.tree_type = 'leaf' \n";
        query += 'LEFT JOIN edu_level el ON u.edu_lev_id = el.edu_lev_id \n';
    }
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

    if (user_status) {
        query += ` AND u.user_status = $${index++}`;
        values.push(user_status);
    }

    if (keyword) {
        // ใช้ AND (...) ครอบเพื่อให้เงื่อนไข OR ทำงานถูกต้องในกลุ่มของมัน
        // ใช้ ILIKE เพื่อให้ค้นหาแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ (Case Insensitive)
        // ใช้ % หน้าหลัง เพื่อหาคำที่มีส่วนประกอบนี้
        query += ` AND (u.code ILIKE $${index} OR u.first_name ILIKE $${index} OR u.last_name ILIKE $${index} OR u.email ILIKE $${index})`;
        values.push(`%${keyword}%`);
        index++;
    }

    if (sort_by) {
        const order = sort_order && sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY u.${sort_by} ${order} \n`;
    }

    if (limit) {
        query += ` LIMIT $${index++} \n`;
        values.push(limit);
    }

    if (offset) {
        query += ` OFFSET $${index++} \n`;
        values.push(offset);
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

export const createUserSys = async (req: Request<{}, {}, UserSysFields>, res: Response) => {
    const {
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
        user_status,
        profile_pic,
        learning_area_id,
        program_id
    } = req.body;


    if (!email || !first_name || !last_name || !role_id || !code || !inst_id) {
        res.status(400).json({
            success: false,
            message: 'Missing required fields: email, first_name, last_name, role_id, flag_valid'
        });
        return;
    }


    const initialPassword = generateInitialPassword();
    const hashedPassword = await hashPasswordWithSalt(initialPassword);

    const insertQuery = `
        INSERT INTO user_sys 
        (email, password, first_name, middle_name, last_name, phone, role_id, code, edu_lev_id, inst_id, user_status, profile_pic, flag_valid, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *;
    `;

    const values = [
        email,
        hashedPassword,
        first_name,
        middle_name || null,
        last_name,
        phone || null,
        role_id,
        code || null,
        edu_lev_id || null,
        inst_id || null,
        user_status || null,
        profile_pic || null,
        true,
    ];

    try {
        const userData = await queryPostgresDB(insertQuery, globalSmartGISConfig, values);

        if (userData.length === 0) {
            res.status(500).json({ success: false, message: 'Failed to create UserSys' });
            return;
        } else if (learning_area_id) {
            const learningAreaUsData = await createLearningAreaUserSysFunc({user_sys_id: userData[0].user_sys_id, learning_area_id});
        } else if (program_id) {
            const programUsData =  await createProgramUserSysFunc({user_sys_id: userData[0].user_sys_id, program_id});
        }
        // else {
        //     await sendInitialPasswordEmail(email, initialPassword);
        // }

        res.status(201).json({ success: true, message: 'UserSys created successfully' });
        return;

    } catch (error) {
        console.error('Error creating UserSys:', error);
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};

export const updateUserSys = async (req: Request<{}, {}, UserSysFields>, res: Response) => {

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
        user_status,
        profile_pic,
        learning_area_id,
    } = req.body;

    if (!user_sys_id) {
        return res.status(400).json({
            success: false,
            message: 'Missing required field: user_sys_id'
        });
    }

    let query = `UPDATE user_sys SET `;
    const values: any[] = [];
    let index = 1;

    if (email) {
        query += ` email = $${index++},`;
        values.push(email);
    }

    if (first_name) {
        query += ` first_name = $${index++},`;
        values.push(first_name);
    }

    if (middle_name) {
        query += ` middle_name = $${index++},`;
        values.push(middle_name);
    }

    if (last_name) {
        query += ` last_name = $${index++},`;
        values.push(last_name);
    }

    if (phone) {
        query += ` phone = $${index++},`;
        values.push(phone);
    }

    if (role_id) {
        query += ` role_id = $${index++},`;
        values.push(role_id);
    }

    if (code) {
        query += ` code = $${index++},`;
        values.push(code);
    }

    if (edu_lev_id) {
        query += ` edu_lev_id = $${index++},`;
        values.push(edu_lev_id);
    }

    if (inst_id) {
        query += ` inst_id = $${index++},`;
        values.push(inst_id);
    }

    if (typeof flag_valid === "boolean") {
        query += ` flag_valid = $${index++},`;
        values.push(flag_valid);
    }

    if (user_status) {
        query += ` user_status = $${index++},`;
        values.push(user_status);
    }

    if (profile_pic) {
        query += ` profile_pic = $${index++},`;
        values.push(profile_pic);
    }

    query += ` updated_at = NOW() WHERE user_sys_id = $${index++} RETURNING *;`;
    values.push(user_sys_id);

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    }
    catch (error) {
        console.error('Error updating UserSys:', error);
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};