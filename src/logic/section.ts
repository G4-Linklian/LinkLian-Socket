import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { sectionFields } from '../interface/section.interface';


export const getSectionMaster = async (req: Request<{}, {}, sectionFields>, res: Response) => {

    const {
        section_id,
        semester_id,
        subject_id,
        flag_valid,

        schedule_id,
        day_of_week,
        start_time,
        end_time,
        room_location_id,

    } = req.body

    if (
        !section_id &&
        !semester_id &&
        !subject_id &&
        !schedule_id &&
        !day_of_week &&
        !start_time &&
        !end_time &&
        !room_location_id &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM section s \n'
    query += 'LEFT JOIN semester sem ON s.semester_id = sem.semester_id \n'
    query += 'LEFT JOIN subject sub ON s.subject_id = sub.subject_id \n'
    query += 'LEFT JOIN section_schedule sch ON s.schedule_id = sch.schedule_id \n'
    query += 'LEFT JOIN room_location rl ON s.room_location_id = rl.room_location_id \n'
    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (section_id) {
        query += ` AND s.section_id = $${index++}`;
        values.push(section_id);
    }

    if (semester_id) {
        query += ` AND s.semester_id = $${index++}`;
        values.push(semester_id);
    }

    if (subject_id) {
        query += ` AND s.subject_id = $${index++}`;
        values.push(subject_id);
    }

    if (schedule_id) {
        query += ` AND s.schedule_id = $${index++}`;
        values.push(schedule_id);
    }

    if (day_of_week) {
        query += ` AND s.day_of_week = $${index++}`;
        values.push(day_of_week);
    }

    if (start_time) {
        query += ` AND s.start_time = $${index++}`;
        values.push(start_time);
    }

    if (end_time) {
        query += ` AND s.end_time = $${index++}`;
        values.push(end_time);
    }

    if (room_location_id) {
        query += ` AND s.room_location_id = $${index++}`;
        values.push(room_location_id);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND s.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        console.error("Error querying sections:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        return;
    }

};

export const getSectionEducator = async (req: Request<{}, {}, sectionFields>, res: Response) => {

    const {
        section_id,
        semester_id,
        subject_id,
        flag_valid,
        user_sys_id,
        role_id,
        role_name,
        role_type,
    } = req.body

    if (
        !section_id &&
        !semester_id &&
        !subject_id &&
        !user_sys_id &&
        !role_id &&
        !role_name &&
        !role_type &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM section s \n'
    query += 'LEFT JOIN semester sem ON s.semester_id = sem.semester_id \n'
    query += 'LEFT JOIN subject sub ON s.subject_id = sub.subject_id \n'
    query += 'LEFT JOIN section_educator se ON s.section_id = se.section_id \n'
    query += 'LEFT JOIN user_sys us ON se.educator_id = us.user_sys_id \n'
    query += 'LEFT JOIN role r ON us.role_id = r.role_id \n'
    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (section_id) {
        query += ` AND s.section_id = $${index++}`;
        values.push(section_id);
    }

    if (semester_id) {
        query += ` AND s.semester_id = $${index++}`;
        values.push(semester_id);
    }

    if (subject_id) {
        query += ` AND s.subject_id = $${index++}`;
        values.push(subject_id);
    }

    if (user_sys_id) {
        query += ` AND us.user_sys_id = $${index++}`;
        values.push(user_sys_id);
    }

    if (role_id) {
        query += ` AND r.role_id = $${index++}`;
        values.push(role_id);
    }

    if (role_name) {
        query += ` AND r.role_name = $${index++}`;
        values.push(role_name);
    }

    if (role_type) {
        query += ` AND r.role_type = $${index++}`;
        values.push(role_type);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND s.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        console.error("Error querying sections:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        return;
    }

};

export const getSectionEnrollment = async (req: Request<{}, {}, sectionFields>, res: Response) => {

    const {
        section_id,
        semester_id,
        subject_id,
        flag_valid,
        user_sys_id,
        role_id,
        role_name,
        role_type,
    } = req.body

    if (
        !section_id &&
        !semester_id &&
        !subject_id &&
        !user_sys_id &&
        !role_id &&
        !role_name &&
        !role_type &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM section s \n'
    query += 'LEFT JOIN semester sem ON s.semester_id = sem.semester_id \n'
    query += 'LEFT JOIN subject sub ON s.subject_id = sub.subject_id \n'
    query += 'LEFT JOIN enrollment en ON s.section_id = en.section_id \n'
    query += 'LEFT JOIN user_sys us ON en.student_id = us.user_sys_id \n'
    query += 'LEFT JOIN role r ON us.role_id = r.role_id \n'
    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (section_id) {
        query += ` AND s.section_id = $${index++}`;
        values.push(section_id);
    }

    if (semester_id) {
        query += ` AND s.semester_id = $${index++}`;
        values.push(semester_id);
    }

    if (subject_id) {
        query += ` AND s.subject_id = $${index++}`;
        values.push(subject_id);
    }

    if (user_sys_id) {
        query += ` AND us.user_sys_id = $${index++}`;
        values.push(user_sys_id);
    }

    if (role_id) {
        query += ` AND r.role_id = $${index++}`;
        values.push(role_id);
    }

    if (role_name) {
        query += ` AND r.role_name = $${index++}`;
        values.push(role_name);
    }

    if (role_type) {
        query += ` AND r.role_type = $${index++}`;
        values.push(role_type);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND s.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        console.error("Error querying sections:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        return;
    }

};

export const createSection = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const { subject_id, semester_id, section_name, flag_valid } = req.body;

    if (!subject_id || !semester_id || !section_name || typeof flag_valid !== 'boolean') {
        res.status(400).json({ success: false, message: 'Missing required fields!' });
        return;
    }

    const query = `INSERT INTO section (subject_id, semester_id, section_name, flag_valid, created_at, updated_at) 
                   VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *;`;
    const values = [subject_id, semester_id, section_name, flag_valid];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};

export const createSectionEducator = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const { subject_id, user_sys_id, position, flag_valid } = req.body;

    if (!subject_id || !user_sys_id || !position || typeof flag_valid !== 'boolean') {
        res.status(400).json({ success: false, message: 'Missing required fields!' });
        return;
    }

    const query = `INSERT INTO section_educator (subject_id, educator_id, position, flag_valid) 
                   VALUES ($1, $2, $3, $4) RETURNING *;`;
    const values = [subject_id, user_sys_id, position, flag_valid];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};

export const createSectionEnrollment = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const { subject_id, user_sys_id, flag_valid } = req.body;

    if (!subject_id || !user_sys_id || typeof flag_valid !== 'boolean') {
        res.status(400).json({ success: false, message: 'Missing required fields!' });
        return;
    }

    const query = `INSERT INTO enrollment (subject_id, student_id, flag_valid, enrolled_at) 
                   VALUES ($1, $2, $3, NOW()) RETURNING *;`;
    const values = [subject_id, user_sys_id, flag_valid];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};


export const updateSection = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const { section_id, subject_id, semester_id, section_name, flag_valid } = req.body;

    if (!section_id) {
        res.status(400).json({ success: false, message: 'section_id is required!' });
        return;
    }

    const updates = [];
    const values: any[] = [];
    let index = 1;

    if (subject_id) {
        updates.push(`subject_id = $${index++}`);
        values.push(subject_id);
    }

    if (semester_id) {
        updates.push(`semester_id = $${index++}`);
        values.push(semester_id);
    }

    if (section_name) {
        updates.push(`section_name = $${index++}`);
        values.push(section_name);
    }

    if (typeof flag_valid === 'boolean') {
        updates.push(`flag_valid = $${index++}`);
        values.push(flag_valid);
    }

    if (updates.length === 0) {
        res.status(400).json({ success: false, message: 'No fields to update!' });
        return;
    }

    values.push(section_id);

    const query = `UPDATE section SET ${updates.join(', ')} WHERE section_id = $${index} RETURNING *;`;

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};


export const updateSectionEducator = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const { section_id, user_sys_id, position, flag_valid } = req.body;

    if (!section_id && !user_sys_id) {
        res.status(400).json({ success: false, message: 'At least one of section_id or user_sys_id is required!' });
        return;
    }

    const updates = [];
    const values: any[] = [];
    let index = 1;

    if (section_id) {
        updates.push(`section_id = $${index++}`);
        values.push(section_id);
    }

    if (user_sys_id) {
        updates.push(`educator_id = $${index++}`);
        values.push(user_sys_id);
    }

    if (position) {
        updates.push(`position = $${index++}`);
        values.push(position);
    }

    if (typeof flag_valid === 'boolean') {
        updates.push(`flag_valid = $${index++}`);
        values.push(flag_valid);
    }

    if (updates.length === 0) {
        res.status(400).json({ success: false, message: 'No fields to update!' });
        return;
    }

    const query = `UPDATE section_educator SET ${updates.join(', ')} WHERE 1=1 
                   ${section_id ? `AND section_id = $${index++}` : ''} 
                   ${user_sys_id ? `AND educator_id = $${index}` : ''} RETURNING *;`;

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};


export const updateSectionEnrollment = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const { section_id, user_sys_id, flag_valid } = req.body;

    if (!section_id && !user_sys_id) {
        res.status(400).json({ success: false, message: 'At least one of section_id or user_sys_id is required!' });
        return;
    }

    const updates = [];
    const values: any[] = [];
    let index = 1;

    if (section_id) {
        updates.push(`section_id = $${index++}`);
        values.push(section_id);
    }

    if (user_sys_id) {
        updates.push(`educator_id = $${index++}`);
        values.push(user_sys_id);
    }

    if (typeof flag_valid === 'boolean') {
        updates.push(`flag_valid = $${index++}`);
        values.push(flag_valid);
    }

    if (updates.length === 0) {
        res.status(400).json({ success: false, message: 'No fields to update!' });
        return;
    }

    const query = `UPDATE enrollment SET ${updates.join(', ')} WHERE 1=1 
                   ${section_id ? `AND section_id = $${index++}` : ''} 
                   ${user_sys_id ? `AND educator_id = $${index}` : ''} RETURNING *;`;

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};


export const deleteSection = async (req: Request<{}, {}, { section_id: number }>, res: Response) => {
    const { section_id } = req.body;

    if (!section_id) {
        res.status(400).json({ success: false, message: 'section_id is required!' });
        return;
    }

    const query = `DELETE FROM section WHERE section_id = $1 RETURNING *;`;
    const values = [section_id];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        if (result.length === 0) {
            res.status(404).json({ success: false, message: 'Section not found!' });
            return;
        }
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};

export const deleteSectionEducator = async (req: Request<{}, {}, { section_id?: number; user_sys_id?: number }>, res: Response) => {
    const { section_id, user_sys_id } = req.body;

    if (!section_id && !user_sys_id) {
        res.status(400).json({ success: false, message: 'At least one of section_id or user_sys_id is required!' });
        return;
    }

    const conditions = [];
    const values: any[] = [];
    let index = 1;

    if (section_id) {
        conditions.push(`section_id = $${index++}`);
        values.push(section_id);
    }

    if (user_sys_id) {
        conditions.push(`educator_id = $${index++}`);
        values.push(user_sys_id);
    }

    const query = `DELETE FROM section_educator WHERE ${conditions.join(' AND ')} RETURNING *;`;

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        if (result.length === 0) {
            res.status(404).json({ success: false, message: 'No matching records found!' });
            return;
        }
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};

export const deleteSectionEnrollment = async (req: Request<{}, {}, { section_id?: number; user_sys_id?: number }>, res: Response) => {
    const { section_id, user_sys_id } = req.body;

    if (!section_id && !user_sys_id) {
        res.status(400).json({ success: false, message: 'At least one of section_id or user_sys_id is required!' });
        return;
    }

    const conditions = [];
    const values: any[] = [];
    let index = 1;

    if (section_id) {
        conditions.push(`section_id = $${index++}`);
        values.push(section_id);
    }

    if (user_sys_id) {
        conditions.push(`student_id = $${index++}`);
        values.push(user_sys_id);
    }

    const query = `DELETE FROM enrollment WHERE ${conditions.join(' AND ')} RETURNING *;`;
    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        if (result.length === 0) {
            res.status(404).json({ success: false, message: 'No matching records found!' });
            return;
        }
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};

