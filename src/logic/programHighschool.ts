import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { programFields } from '../interface/program.interface';

export const getProgramHighschool = async (req: Request<{}, {}, programFields>, res: Response) => {
    const { 
        program_id,
        inst_id,
        program_name,
        program_type,
        parent_id,
        remark,
        flag_valid
    } = req.body;

    if (
        !program_id &&
        !inst_id &&
        !program_name &&
        !program_type &&
        !parent_id &&
        !remark &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM program p \n';
    query += 'LEFT JOIN institution i ON p.inst_id = i.inst_id \n';
    query += 'WHERE 1=1 \n';

    const values: any[] = [];
    let index = 1;

    if (program_id) {
        query += ` AND p.program_id = $${index++}`;
        values.push(program_id);
    }

    if (inst_id) {
        query += ` AND p.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (program_name) {
        query += ` AND p.program_name = $${index++}`;
        values.push(program_name);
    }

    if (program_type) {
        query += ` AND p.program_type = $${index++}`;
        values.push(program_type);
    }

    if (parent_id) {
        query += ` AND p.parent_id = $${index++}`;
        values.push(parent_id);
    }

    if (remark) {
        query += ` AND p.remark = $${index++}`;
        values.push(remark);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND p.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error", error: err });
        return;
    }
};

export const createProgramHighschool = async (req: Request<{}, {}, programFields>, res: Response) => {
    const {
        inst_id,
        program_name,
        program_type,
        parent_id,
        remark,
        flag_valid
    } = req.body;

    if (!inst_id || !program_name || !program_type || typeof flag_valid !== "boolean") {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO program (inst_id, program_name, program_type, parent_id, remark, flag_valid)
                   VALUES ($1, $2, $3, $4, $5, $6)`;
    const values = [inst_id, program_name, program_type, parent_id, remark, flag_valid];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "Program created successfully!" });
    }

    catch (error) {
        res.status(500).json({ success: false, message: "Error creating program", error });
    }
};

export const updateProgramHighschool = async (req: Request<{}, {}, programFields>, res: Response) => {
    const {
        program_id,
        inst_id,
        program_name,
        program_type,
        parent_id,
        remark,
        flag_valid
    } = req.body; 

    if (!program_id) {
        res.status(400).json({ success: false, message: "Missing program_id!" });
        return;
    }

    let query = `UPDATE program SET `;
    const values: any[] = [];
    let index = 1;

    if (inst_id) {
        query += ` inst_id = $${index++},`;
        values.push(inst_id);
    }

    if (program_name) {
        query += ` program_name = $${index++},`;
        values.push(program_name);
    }

    if (program_type) {
        query += ` program_type = $${index++},`;
        values.push(program_type);
    }

    if (parent_id) {
        query += ` parent_id = $${index++},`;
        values.push(parent_id);
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
    query += ` WHERE program_id = $${index}`;
    values.push(program_id);

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, message: "Program updated successfully!" });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating program", error });
        return;
    }
};