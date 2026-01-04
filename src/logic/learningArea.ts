import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { learningAreaFields } from '../interface/learningArea.interface';

export const getLearningArea = async (req: Request<{}, {}, learningAreaFields>, res: Response) => {

    const {
        learning_area_id,
        inst_id,
        learning_area_name,
        remark,
        flag_valid,
        offset,
        limit,
        sort_by,
        sort_order,
        subject_count
    } = req.body

    if (
        !learning_area_id &&
        !inst_id &&
        !learning_area_name &&
        !remark &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT la.*'
    query += ', COUNT(*) OVER() as total_count \n'
    if (subject_count) {
        query += ', COUNT(s.subject_id) AS subject_count \n'
    }
    query += 'FROM learning_area la \n'

    if (subject_count) {
        query += 'LEFT JOIN subject s ON la.learning_area_id = s.learning_area_id \n'
    }

    query += 'LEFT JOIN institution i ON la.inst_id = i.inst_id \n'
    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (learning_area_id) {
        query += ` AND la.learning_area_id = $${index++}`;
        values.push(learning_area_id);
    }

    if (inst_id) {
        query += ` AND la.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (learning_area_name) {
        query += ` AND la.learning_area_name = $${index++}`;
        values.push(learning_area_name);
    }

    if (remark) {
        query += ` AND la.remark = $${index++}`;
        values.push(remark);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND la.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    if (sort_by) {
        const order = sort_order && (sort_order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sort_by} ${order} \n`;
    }

    if (subject_count) {
        query += ' GROUP BY la.learning_area_id \n'
    }

    if (limit) {
        query += ` LIMIT $${index++} \n`;
        values.push(limit);
    }

    if (offset) {
        query += ` OFFSET $${index++} \n`;
        values.push(offset);
    }


    console.log(query);
    console.log(values);

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error", error: err });
        return;
    }
}

export const createLearningArea = async (req: Request<{}, {}, learningAreaFields>, res: Response) => {
    const {
        inst_id,
        learning_area_name,
        remark
    } = req.body;

    if (!inst_id || !learning_area_name) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO learning_area (inst_id, learning_area_name, remark)
                   VALUES ($1, $2, $3)`;
    const values = [inst_id, learning_area_name, remark];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "Learning area created successfully!" });
    }

    catch (error) {
        res.status(500).json({ success: false, message: "Error creating learning area", error });
    }

}

export const updateLearningArea = async (req: Request<{}, {}, learningAreaFields>, res: Response) => {
    const {
        learning_area_id,
        inst_id,
        learning_area_name,
        remark,
        flag_valid
    } = req.body;

    if (!learning_area_id) {
        res.status(400).json({ success: false, message: "Missing learning_area_id!" });
        return;
    }

    let query = `UPDATE learning_area SET `;
    const values: any[] = [];
    let index = 1;

    if (inst_id) {
        query += ` inst_id = $${index++},`;
        values.push(inst_id);
    }

    if (learning_area_name) {
        query += ` learning_area_name = $${index++},`;
        values.push(learning_area_name);
    }

    if (remark) {
        query += ` remark = $${index++},`;
        values.push(remark);
    }

    if (typeof flag_valid === "boolean") {
        query += ` flag_valid = $${index++},`;
        values.push(flag_valid);
    }

    // Remove trailing comma
    query = query.slice(0, -1);
    query += ` WHERE learning_area_id = $${index}`;
    values.push(learning_area_id);

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, message: "Learning area updated successfully!" });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating learning area", error });
        return;
    }
}