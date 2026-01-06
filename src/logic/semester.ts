import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { semesterFields } from '../interface/semester.interface';

export const getSemester = async (req: Request<{}, {}, semesterFields>, res: Response) => {

    const {
        semester_id,
        inst_id,
        semester,
        start_date,
        end_date,
        flag_valid,
        status,
        offset,
        limit,
        sort_by,
        sort_order
    } = req.body

    if (
        !semester_id &&
        !inst_id &&
        !semester &&
        !start_date &&
        !end_date &&
        !status &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }


    let query = ``;

    query += 'SELECT *, COUNT(*) OVER() as total_count FROM semester s \n'
    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (semester_id) {
        query += ` AND s.semester_id = $${index++}`;
        values.push(semester_id);
    }
    if (inst_id) {
        query += ` AND s.inst_id = $${index++}`;
        values.push(inst_id);
    }
    if (semester) {
        query += ` AND s.semester = $${index++}`;
        values.push(semester);
    }
    if (start_date) {
        query += ` AND s.start_date = $${index++}`;
        values.push(start_date);
    }
    if (end_date) {
        query += ` AND s.end_date = $${index++}`;
        values.push(end_date);
    }
    if (typeof flag_valid === "boolean") {
        query += ` AND s.flag_valid = $${index++}`;
        values.push(flag_valid);
    }
    if (status) {
        query += ` AND s.status = $${index++}`;
        values.push(status);
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
        const data = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data });
        return;
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ success: false, message: 'Error fetching data' });
        return;
    }
};

export const createSemester = async (req: Request<{}, {}, semesterFields>, res: Response) => {
    const {
        inst_id,
        semester,
        start_date,
        end_date,
        flag_valid,
        status,
    } = req.body;

    if (!inst_id || !semester || !start_date || !end_date || typeof flag_valid !== "boolean") {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }
    
    let sts = status;
    if (!status) {
        sts = "pending";
    }

    const query = `
        INSERT INTO semester (
            inst_id, 
            semester, 
            start_date, 
            end_date, 
            flag_valid,
            status
        ) 
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;`

    const values = [inst_id, semester, start_date, end_date, flag_valid, sts];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "Semester created successfully!" });
        return;
    } catch (error) {
        console.error('Error creating semester:', error);
        res.status(500).json({ success: false, message: 'Error creating semester' });
        return;
    }
};

export const updateSemester = async (req: Request<{}, {}, semesterFields>, res: Response) => {
    const {
        semester_id,
        inst_id,
        semester,
        start_date,
        end_date,
        flag_valid,
        status,
    } = req.body;

    if (!semester_id) {
        res.status(400).json({ success: false, message: "Semester ID is required for update!" });
        return;
    }

    let query = `UPDATE semester SET`;
    const values: any[] = [];
    let index = 1;

    if (inst_id) {
        query += ` inst_id = $${index++},`;
        values.push(inst_id);
    }
    if (semester) {
        query += ` semester = $${index++},`;
        values.push(semester);
    }
    if (start_date) {
        query += ` start_date = $${index++},`;
        values.push(start_date);
    }
    if (end_date) {
        query += ` end_date = $${index++},`;
        values.push(end_date);
    }
    if (typeof flag_valid === "boolean") {
        query += ` flag_valid = $${index++},`;
        values.push(flag_valid);
    }
    if (status) {
        query += ` status = $${index++},`;
        values.push(status);
    }

    query = query.slice(0, -1);
    query += ` WHERE semester_id = $${index}`;
    values.push(semester_id);


    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, message: "Semester updated successfully!" });
        return;
    } catch (error) {
        console.error('Error updating semester:', error);
        res.status(500).json({ success: false, message: 'Error updating semester' });
        return;
    }
};


export const createSemesterSubject = async (req: Request<{}, {}, semesterFields>, res: Response) => {
    const {
        subject_id,
        semester_id,
        flag_valid,
    } = req.body;

    if (!subject_id || !semester_id || typeof flag_valid !== "boolean") {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `
        INSERT INTO semester_subject_normalize (
            subject_id, 
            semester_id, 
            flag_valid
        ) 
        VALUES ($1, $2, $3)
        RETURNING *;`

    const values = [subject_id, semester_id, flag_valid];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "Semester created successfully!" });
        return;
    } catch (error) {
        console.error('Error creating semester:', error);
        res.status(500).json({ success: false, message: 'Error creating semester' });
        return;
    }
};

export const deleteSemesterSubject = async (req: Request, res: Response) => {
    const { subject_id, semester_id } = req.body;

    if (!subject_id || !semester_id) {
        res.status(400).json({ success: false, message: "Subject ID and Semester ID are required for deletion!" });
        return;
    }

    const query = `DELETE FROM semester_subject_normalize WHERE subject_id = $1 AND semester_id = $2`;
    const values = [subject_id, semester_id];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, message: "Semester subject deleted successfully!" });
        return;
    } catch (error) {
        console.error('Error deleting semester subject:', error);
        res.status(500).json({ success: false, message: 'Error deleting semester subject' });
        return;
    }
};