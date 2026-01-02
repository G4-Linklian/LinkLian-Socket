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

        // learningAreaFields
        learning_area_name,

        // semesterFields
        semester_id,
        semester,
        start_date,
        end_date,

        // institutionFields
        inst_id,
        inst_name_th,
        inst_name_en

    } = req.body;

    if (
        !subject_id &&
        !learning_area_id &&
        !subject_code &&
        !name_th &&
        !name_en &&
        !credit &&
        !hour_per_week &&
        !learning_area_name &&
        !semester_id &&
        !semester &&
        !start_date &&
        !end_date &&
        !inst_id &&
        !inst_name_th &&
        !inst_name_en &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM subject s \n';

    query += 'LEFT JOIN learning_area la ON s.learning_area_id = la.learning_area_id \n';
    query += 'LEFT JOIN institution i ON la.inst_id = i.inst_id \n';
    query += 'LEFT JOIN semester_subject_normalize ssn ON s.subject_id = ssn.subject_id \n';
    query += 'LEFT JOIN semester sem ON ssn.semester_id = sem.semester_id \n';

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

    if (learning_area_name) {
        query += ` AND la.learning_area_name = $${index++}`;
        values.push(learning_area_name);
    }

    if (semester_id) {
        query += ` AND sem.semester_id = $${index++}`;
        values.push(semester_id);
    }

    if (semester) {
        query += ` AND sem.semester = $${index++}`;
        values.push(semester);
    }

    if (start_date) {
        query += ` AND sem.start_date = $${index++}`;
        values.push(start_date);
    }

    if (end_date) {
        query += ` AND sem.end_date = $${index++}`;
        values.push(end_date);
    }

    if (inst_id) {
        query += ` AND i.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (inst_name_th) {
        query += ` AND i.inst_name_th = $${index++}`;
        values.push(inst_name_th);
    }

    if (inst_name_en) {
        query += ` AND i.inst_name_en = $${index++}`;
        values.push(inst_name_en);
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
        flag_valid
    } = req.body;

    if (!learning_area_id || !subject_code || !name_th || !name_en || !credit || !hour_per_week || typeof flag_valid !== "boolean") {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO subject (learning_area_id, subject_code, name_th, name_en, credit, hour_per_week, flag_valid) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    const values = [learning_area_id, subject_code, name_th, name_en, credit, hour_per_week, flag_valid];

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

    query = query.slice(0, -1);
    query += ` WHERE subject_id = $${index}`;
    values.push(subject_id);

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