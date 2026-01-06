import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { eduLevelFields } from '../interface/eduLevel.interface';

export const getEduLevelMaster = async (req: Request<{}, {}, eduLevelFields>, res: Response) => {
    const {
        edu_lev_id,
        level_name,
        edu_type,
        flag_valid,
    } = req.body;

    if (
        !edu_lev_id &&
        !level_name &&
        !edu_type &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = '';

    query += 'SELECT * FROM edu_level e \n';
    query += 'WHERE 1=1 \n';

    const values: any[] = [];
    let index = 1;

    if (edu_lev_id) {
        query += ` AND e.edu_lev_id = $${index++}`;
        values.push(edu_lev_id);
    }

    if (level_name) {
        query += ` AND e.level_name = $${index++}`;
        values.push(level_name);
    }

    if (edu_type) {
        query += ` AND e.edu_type = $${index++}`;
        values.push(edu_type);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND e.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        console.error('Error fetching edulevels:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

export const getEduLevel = async (req: Request<{}, {}, eduLevelFields>, res: Response) => {
    const {
        edu_lev_id,
        level_name,
        edu_type,
        flag_valid,
        program_id,
        inst_id,
        parent_id,
        offset,
        limit,
        sort_by,
        sort_order,
    } = req.body;

    if (
        !edu_lev_id &&
        !level_name &&
        !edu_type &&
        !program_id &&
        !inst_id &&
        !parent_id &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = '';

    query += 'SELECT *, COUNT(*) OVER() as total_count FROM edu_level e \n';
    query += 'LEFT JOIN edu_level_program_normalize elpn ON e.edu_lev_id = elpn.edu_lev_id \n';
    query += 'LEFT JOIN program p ON elpn.program_id = p.program_id \n';
    query += 'WHERE 1=1 \n';

    const values: any[] = [];
    let index = 1;

    query += ' AND p.inst_id IS NOT NULL \n';

    if (edu_lev_id) {
        query += ` AND e.edu_lev_id = $${index++}`;
        values.push(edu_lev_id);
    }

    if (level_name) {
        query += ` AND e.level_name = $${index++}`;
        values.push(level_name);
    }

    if (edu_type) {
        query += ` AND e.edu_type = $${index++}`;
        values.push(edu_type);
    }

    if (program_id) {
        query += ` AND e.program_id = $${index++}`;
        values.push(program_id);
    }

    if (inst_id) {
        query += ` AND p.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (parent_id) {
        query += ` AND p.parent_id = $${index++}`;
        values.push(parent_id);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND e.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    if (sort_by) {
        const order = sort_order && (sort_order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
        query += ` ORDER BY e.${sort_by} , p.program_id ${order} \n`;
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
        console.error('Error fetching edulevels:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
    }
};

export const createEduLevel = async (req: Request<{}, {}, eduLevelFields>, res: Response) => {
    const {
        level_name,
        edu_type,
    } = req.body;

    if (!level_name || !edu_type) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO edu_level (level_name, edu_type, created_at, updated_at) 
                   VALUES ($1, $2, NOW(), NOW())`;
    const values = [level_name, edu_type];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "EduLevel created successfully!" });
        return;
    } catch (error) {
        console.error('Error creating edulevel:', error);
        res.status(500).json({ success: false, message: 'Error creating edulevel' });
        return;
    }
};

export const updateEduLevel = async (req: Request<{}, {}, eduLevelFields>, res: Response) => {
    const {
        edu_lev_id,
        level_name,
        edu_type,
        flag_valid,
    } = req.body;

    if (!edu_lev_id) {
        res.status(400).json({ success: false, message: "EduLevel ID is required for update!" });
        return;
    }

    let query = `UPDATE edulevel SET`;
    const values: any[] = [];
    let index = 1;

    if (level_name) {
        query += ` level_name = $${index++},`;
        values.push(level_name);
    }
    if (edu_type) {
        query += ` edu_type = $${index++},`;
        values.push(edu_type);
    }
    if (typeof flag_valid === "boolean") {
        query += ` flag_valid = $${index++},`;
        values.push(flag_valid);
    }

    query += ` updated_at = NOW() \n`;

    query = query.slice(0, -1);
    query += ` WHERE edu_lev_id = $${index}`;
    values.push(edu_lev_id);

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, message: "EduLevel updated successfully!" });
        return;
    } catch (error) {
        console.error('Error updating edulevel:', error);
        res.status(500).json({ success: false, message: 'Error updating edulevel' });
        return;
    }
};


export const createEduLevelNorm = async (req: Request<{}, {}, eduLevelFields>, res: Response) => {
    const {
        edu_lev_id,
        program_id,
    } = req.body;

    if (!edu_lev_id || !program_id) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO edu_level_program_normalize (edu_lev_id, program_id, flag_valid) 
                   VALUES ($1, $2, true)`;
    const values = [edu_lev_id, program_id];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "EduLevel created successfully!" });
        return;
    } catch (error) {
        console.error('Error creating edulevel:', error);
        res.status(500).json({ success: false, message: 'Error creating edulevel' });
        return;
    }
};


export const updateEduLevelNorm = async (req: Request<{}, {}, eduLevelFields>, res: Response) => {
    const {
        edu_lev_id,
        program_id,
    } = req.body;

    if (!edu_lev_id || !program_id) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `UPDATE edu_level_program_normalize SET flag_valid = true WHERE edu_lev_id = $1 AND program_id = $2`;
    const values = [edu_lev_id, program_id];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "EduLevel created successfully!" });
        return;
    } catch (error) {
        console.error('Error creating edulevel:', error);
        res.status(500).json({ success: false, message: 'Error creating edulevel' });
        return;
    }
};


export const deleteEduLevelNorm = async (req: Request<{}, {}, eduLevelFields>, res: Response) => {
    const {
        edu_lev_id,
        program_id,
    } = req.body;

    if (!edu_lev_id || !program_id) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `DELETE FROM edu_level_program_normalize WHERE edu_lev_id = $1 AND program_id = $2`;
    const values = [edu_lev_id, program_id];

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "EduLevel created successfully!" });
        return;
    } catch (error) {
        console.error('Error creating edulevel:', error);
        res.status(500).json({ success: false, message: 'Error creating edulevel' });
        return;
    }
};