import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { sectionFields } from '../interface/section.interface';
import { generateUpdateQuery } from '../utils/querySupport';


export const getSectionMaster = async (req: Request<{}, {}, sectionFields>, res: Response) => {

    const {
        section_id,
        semester_id,
        subject_id,
        flag_valid,
        inst_id,
        offset,
        limit,
        sort_by,
        sort_order,
        count_student = true
    } = req.body

    if (
        !section_id &&
        !semester_id &&
        !subject_id &&
        !inst_id &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += `
        SELECT 
            s.*, 
            sub.*, 
            sem.*,
            la.learning_area_name
        `;

    if (count_student) {
        query += `,
                (
                    SELECT COUNT(*)
                    FROM enrollment e
                    WHERE e.section_id = s.section_id
                ) AS student_count
          `;
    }

    query += `,
        COUNT(*) OVER() AS total_count
        FROM section s
            LEFT JOIN semester sem ON s.semester_id = sem.semester_id
            LEFT JOIN subject sub ON s.subject_id = sub.subject_id
            LEFT JOIN learning_area la ON sub.learning_area_id = la.learning_area_id
        WHERE 1=1
        `;

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

    if (typeof flag_valid === "boolean") {
        query += ` AND s.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    if (inst_id) {
        query += ` AND sem.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (sort_by) {
        const order = sort_order && (sort_order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
        query += ` ORDER BY s.${sort_by} ${order} \n`;
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
    } catch (error) {
        console.error("Error querying sections:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        return;
    }

};

export const getSection = async (req: Request<{}, {}, sectionFields>, res: Response) => {

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
        inst_id,
        offset,
        limit,
        sort_by,
        sort_order
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
        !inst_id &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += `SELECT s.*, 
            sch.schedule_id, sch.day_of_week, sch.start_time, sch.end_time, 
            sub.*, 
            sem.*,
            la.learning_area_name,
            rl.floor, rl.room_number, rl.room_location_id, 
            b.building_id, b.building_name, b.building_no, b.room_format \n
        `;
    query += ', COUNT(*) OVER() AS total_count FROM section s \n'
    query += 'LEFT JOIN section_schedule sch ON s.section_id = sch.section_id \n'
    query += 'LEFT JOIN semester sem ON s.semester_id = sem.semester_id \n'
    query += 'LEFT JOIN subject sub ON s.subject_id = sub.subject_id \n'
    query += 'LEFT JOIN learning_area la ON sub.learning_area_id = la.learning_area_id \n'
    query += 'LEFT JOIN room_location rl ON sch.room_location_id = rl.room_location_id \n'
    query += 'LEFT JOIN building b ON rl.building_id = b.building_id \n'
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
        query += ` AND rl.schedule_id = $${index++}`;
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
        query += ` AND sch.room_location_id = $${index++}`;
        values.push(room_location_id);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND s.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    if (inst_id) {
        query += ` AND sem.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (sort_by) {
        const order = sort_order && (sort_order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
        query += ` ORDER BY s.${sort_by} ${order} \n`;
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
    } catch (error) {
        console.error("Error querying sections:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        return;
    }

};

export const getSchedule = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const {
        schedule_id,
        section_id,
        day_of_week,
        start_time,
        end_time,
        room_location_id,
        flag_valid,
    } = req.body

    if (
        !schedule_id &&
        !section_id &&
        !day_of_week &&
        !start_time &&
        !end_time &&
        !room_location_id &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += `SELECT * FROM section_schedule sch \n`
    query += 'LEFT JOIN room_location rl ON sch.room_location_id = rl.room_location_id \n'
    query += 'LEFT JOIN building b ON rl.building_id = b.building_id \n'
    query += `WHERE 1=1 \n`
    const values: any[] = [];

    let index = 1;
    if (schedule_id) {
        query += ` AND sch.schedule_id = $${index++}`;
        values.push(schedule_id);
    }

    if (section_id) {
        query += ` AND sch.section_id = $${index++}`;
        values.push(section_id);
    }

    if (day_of_week) {
        query += ` AND sch.day_of_week = $${index++}`;
        values.push(day_of_week);
    }

    if (start_time) {
        query += ` AND sch.start_time = $${index++}`;
        values.push(start_time);
    }

    if (end_time) {
        query += ` AND sch.end_time = $${index++}`;
        values.push(end_time);
    }

    if (room_location_id) {
        query += ` AND sch.room_location_id = $${index++}`;
        values.push(room_location_id);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND sch.flag_valid = $${index++}`;
        values.push(flag_valid);
    }
    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;

    } catch (error) {
        console.error("Error querying schedules:", error);
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

    query += 'SELECT * FROM section_educator se \n'
    query += 'LEFT JOIN section s ON s.section_id = se.section_id \n'
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
        offset,
        limit,
        sort_by,
        sort_order
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

    query += 'SELECT *, COUNT(*) OVER() as total_count FROM enrollment en \n'
    query += 'LEFT JOIN section s ON s.section_id = en.section_id AND en.section_id IS NOT NULL \n'
    query += 'LEFT JOIN user_sys us ON en.student_id = us.user_sys_id \n'
    query += 'LEFT JOIN role r ON us.role_id = r.role_id \n'
    query += 'LEFT JOIN edu_level el ON us.edu_lev_id = el.edu_lev_id \n'
    query += 'LEFT JOIN user_sys_program_normalize uspn ON us.user_sys_id = uspn.user_sys_id \n'
    query += 'LEFT JOIN program p ON uspn.program_id = p.program_id \n'
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

    if (sort_by) {
        const order = sort_order && (sort_order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
        query += ` ORDER BY us.${sort_by} ${order} \n`;
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
    } catch (error) {
        console.error("Error querying sections:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        return;
    }

};

export const createSection = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const {
        subject_id,
        semester_id,
        section_name,
    } = req.body;

    if (!subject_id || !semester_id || !section_name) {
        res.status(400).json({ success: false, message: 'Missing required fields!' });
        return;
    }

    const query = `INSERT INTO section (subject_id, semester_id, section_name, flag_valid, created_at, updated_at) 
                   VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *;`;
    const values = [subject_id, semester_id, section_name, true];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};


export const createSchedule = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const {
        section_id,
        day_of_week,
        start_time,
        end_time,
        room_location_id,
    } = req.body;

    if (!section_id || !day_of_week || !start_time || !end_time || !room_location_id) {
        res.status(400).json({ success: false, message: 'Missing required fields!' });
        return;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

    if (!timeRegex.test(String(start_time)) || !timeRegex.test(String(end_time))) {
        return res.status(400).json({
            success: false,
            message: 'Invalid time format (HH:mm:ss)'
        });
    }

    const query = `INSERT INTO section_schedule (section_id, day_of_week, start_time, end_time, room_location_id, flag_valid) 
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
    const values = [section_id, day_of_week, start_time, end_time, room_location_id, true];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
        return;
    }
};

export const createSectionSchedule = async (
    req: Request<{}, {}, sectionFields>,
    res: Response
) => {
    const {
        subject_id,
        semester_id,
        section_name,
        day_of_week,
        start_time,
        end_time,
        room_location_id
    } = req.body;

    if (
        !subject_id ||
        !semester_id
    ) {
        res.status(400).json({ success: false, message: 'Missing required fields!' });
        return;
    }

    const insertSectionQuery = `
    INSERT INTO section 
      (subject_id, semester_id, section_name, flag_valid, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, NOW(), NOW()) 
    RETURNING section_id;
  `;

    const sectionValues = [subject_id, semester_id, section_name, true];

    try {

        const sectionResult = await queryPostgresDB(
            insertSectionQuery,
            globalSmartGISConfig,
            sectionValues
        );

        const section_id = sectionResult[0].section_id;

        const insertScheduleQuery = `
      INSERT INTO section_schedule
        (section_id, day_of_week, start_time, end_time, room_location_id, flag_valid)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

        const scheduleValues = [
            section_id,
            day_of_week,
            start_time,
            end_time,
            room_location_id,
            true,
        ];

        const scheduleResult = await queryPostgresDB(
            insertScheduleQuery,
            globalSmartGISConfig,
            scheduleValues
        );

        res.status(201).json({
            success: true,
            data: {
                section: sectionResult[0],
                schedule: scheduleResult[0],
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error,
        });
    }
};

export const createSectionEducator = async (req: Request<{}, {}, sectionFields>, res: Response) => {
    const { section_id, user_sys_id, position, flag_valid } = req.body;

    if (!section_id || !user_sys_id || !position) {
        res.status(400).json({ success: false, message: 'Missing required fields!' });
        return;
    }

    const query = `INSERT INTO section_educator (section_id, educator_id, position, flag_valid) 
                   VALUES ($1, $2, $3, $4) RETURNING *;`;
    const values = [section_id, user_sys_id, position, true];

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
    const { section_id, user_sys_id, flag_valid } = req.body;

    if (!section_id || !user_sys_id) {
        res.status(400).json({ success: false, message: 'Missing required fields!' });
        return;
    }

    const query = `INSERT INTO enrollment (section_id, student_id, flag_valid, enrolled_at) 
                   VALUES ($1, $2, $3, NOW()) RETURNING *;`;
    const values = [section_id, user_sys_id, true];

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

export const updateSectionSchedule = async (
    req: Request,
    res: Response
) => {
    const { section_id, schedule_id, ...updateData } = req.body;

    if (!section_id) {
        res.status(400).json({ success: false, message: 'Missing section_id for update!' });
        return;
    }

    const sectionColumns = ['subject_id', 'semester_id', 'section_name'];
    const scheduleColumns = ['day_of_week', 'start_time', 'end_time', 'room_location_id'];

    try {
        let updatedSection = null;
        let updatedSchedule = null;

        const sectionQueryObj = generateUpdateQuery(
            'section',          // Table Name
            'section_id',       // Where Column
            section_id,         // Where Value
            updateData,         // Data Object
            sectionColumns,     // Allowed Columns
            true                // มี updated_at ไหม? (เดิมมี)
        );

        if (sectionQueryObj) {
            const result = await queryPostgresDB(
                sectionQueryObj.query,
                globalSmartGISConfig,
                sectionQueryObj.values
            );
            updatedSection = result[0];
        }

        // --- 2. Update Table: SECTION_SCHEDULE ---
        const scheduleQueryObj = generateUpdateQuery(
            'section_schedule',    // Table Name
            'schedule_id',          // Where Column (เชื่อมโยงด้วย section_id)
            schedule_id,            // Where Value
            updateData,            // Data Object
            scheduleColumns,       // Allowed Columns
            false                  // มี updated_at ไหม? (เดิมไม่มี)
        );

        if (scheduleQueryObj) {
            const result = await queryPostgresDB(
                scheduleQueryObj.query,
                globalSmartGISConfig,
                scheduleQueryObj.values
            );
            updatedSchedule = result[0];
        }


        if (!updatedSection && !updatedSchedule) {
            res.status(200).json({
                success: true,
                message: 'No fields provided for update, nothing changed.',
                data: null
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                section: updatedSection || 'No changes',
                schedule: updatedSchedule || 'No changes',
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error during update',
            error,
        });
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

