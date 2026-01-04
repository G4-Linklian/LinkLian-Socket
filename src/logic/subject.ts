import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { subjectFields } from '../interface/subject.interface';

export const getSubject = async (req: Request<{}, {}, subjectFields>, res: Response) => {
    const {
        // subjectFields
        subject_id,
        learning_area_id,
        subject_code,
        name_th,
        name_en,
        credit,
        hour_per_week,
        flag_valid,
        inst_id,
        offset,
        limit,
        sort_by,
        sort_order,
        keyword
    } = req.body;

    if (
        !subject_id &&
        !learning_area_id &&
        !subject_code &&
        !name_th &&
        !name_en &&
        !credit &&
        !hour_per_week &&
        !inst_id &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT *, COUNT(*) OVER() as total_count FROM subject s \n';

    query += 'LEFT JOIN learning_area la ON s.learning_area_id = la.learning_area_id \n';
    // query += 'LEFT JOIN institution i ON la.inst_id = i.inst_id \n';
    // query += 'LEFT JOIN semester_subject_normalize ssn ON s.subject_id = ssn.subject_id \n';
    // query += 'LEFT JOIN semester sem ON ssn.semester_id = sem.semester_id \n';

    query += 'WHERE 1=1 \n';

    const values: any[] = [];
    let index = 1;

    if (subject_id) {
        query += ` AND s.subject_id = $${index++}`;
        values.push(subject_id);
    }

    if (learning_area_id) {
        query += ` AND s.learning_area_id = $${index++}`;
        values.push(learning_area_id);
    }

    if (subject_code) {
        query += ` AND s.subject_code = $${index++}`;
        values.push(subject_code);
    }

    if (name_th) {
        query += ` AND s.name_th = $${index++}`;
        values.push(name_th);
    }

    if (name_en) {
        query += ` AND s.name_en = $${index++}`;
        values.push(name_en);
    }

    if (credit) {
        query += ` AND s.credit = $${index++}`;
        values.push(credit);
    }

    if (hour_per_week) {
        query += ` AND s.hour_per_week = $${index++}`;
        values.push(hour_per_week);
    }

    if (inst_id) {
        query += ` AND la.inst_id = $${index++}`;
        values.push(inst_id);
    }

    // if (inst_name_th) {
    //     query += ` AND i.inst_name_th = $${index++}`;
    //     values.push(inst_name_th);
    // }

    // if (inst_name_en) {
    //     query += ` AND i.inst_name_en = $${index++}`;
    //     values.push(inst_name_en);
    // }

    if (typeof flag_valid === "boolean") {
        query += ` AND s.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    if (keyword) {
        // ใช้ AND (...) ครอบเพื่อให้เงื่อนไข OR ทำงานถูกต้องในกลุ่มของมัน
        // ใช้ ILIKE เพื่อให้ค้นหาแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ (Case Insensitive)
        // ใช้ % หน้าหลัง เพื่อหาคำที่มีส่วนประกอบนี้
        query += ` AND (s.subject_code ILIKE $${index} OR s.name_th ILIKE $${index})`;
        values.push(`%${keyword}%`);
        index++;
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
        console.error('Error fetching subjects:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

export const createSubject = async (req: Request<{}, {}, subjectFields>, res: Response) => {
    const {
        learning_area_id,
        subject_code,
        name_th,
        name_en,
        credit,
        hour_per_week,
    } = req.body;

    if (!learning_area_id || !subject_code || !name_th || !name_en || !credit || !hour_per_week) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO subject (learning_area_id, subject_code, name_th, name_en, credit, hour_per_week, created_at, updated_at) 
                   VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`;
    const values = [learning_area_id, subject_code, name_th, name_en, credit, hour_per_week];

    console.log(query);
    console.log(values);

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "Subject created successfully!" });
        return;
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ success: false, message: 'Error creating subject' });
        return;
    }
};


export const updateSubject = async (req: Request<{}, {}, subjectFields>, res: Response) => {
    const {
        subject_id,
        learning_area_id,
        subject_code,
        name_th,
        name_en,
        credit,
        hour_per_week,
        flag_valid
    } = req.body;

    if (!subject_id) {
        res.status(400).json({ success: false, message: "Subject ID is required for update!" });
        return;
    }

    let query = `UPDATE subject SET`;
    const values: any[] = [];
    let index = 1;

    if (learning_area_id) {
        query += ` learning_area_id = $${index++},`;
        values.push(learning_area_id);
    }
    if (subject_code) {
        query += ` subject_code = $${index++},`;
        values.push(subject_code);
    }
    if (name_th) {
        query += ` name_th = $${index++},`;
        values.push(name_th);
    }
    if (name_en) {
        query += ` name_en = $${index++},`;
        values.push(name_en);
    }
    if (credit) {
        query += ` credit = $${index++},`;
        values.push(credit);
    }
    if (hour_per_week) {
        query += ` hour_per_week = $${index++},`;
        values.push(hour_per_week);
    }
    if (typeof flag_valid === "boolean") {
        query += ` flag_valid = $${index++},`;
        values.push(flag_valid);
    }

    query += ` updated_at = NOW() \n`;

    query = query.slice(0, -1);
    query += ` WHERE subject_id = $${index}`;
    values.push(subject_id);

    console.log(query);
    console.log(values);

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, message: "Subject updated successfully!" });
        return;
    } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({ success: false, message: 'Error updating subject' });
        return;
    }
};