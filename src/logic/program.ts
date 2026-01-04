import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { programFields } from '../interface/program.interface';

export const getProgram = async (req: Request<{}, {}, programFields>, res: Response) => {
    const {
        program_id,
        inst_id,
        program_name,
        program_type,
        parent_id,
        flag_valid,
        parent_ids,
        tree_type,
        inst_type,
        children_count,
        sort_by,
        sort_order,
        limit,
        offset,
    } = req.body;

    if (
        !program_id &&
        !inst_id &&
        !program_name &&
        !program_type &&
        !parent_id &&
        !tree_type &&
        !parent_ids &&
        !inst_type &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += `
        SELECT
          p.*,
          i.inst_type,
          COUNT(*) OVER() AS total_count
        `;

    if (children_count) {
        query += `,
          (
            WITH RECURSIVE program_tree AS (
              SELECT
                p2.program_id,
                p2.parent_id,
                p2.tree_type
              FROM program p2
              WHERE p2.program_id = p.program_id
            
              UNION ALL
            
              SELECT
                c.program_id,
                c.parent_id,
                c.tree_type
              FROM program c
              INNER JOIN program_tree pt
                ON c.parent_id = pt.program_id
            )
            SELECT COUNT(*)
            FROM edu_level_program_normalize elpn
            WHERE elpn.program_id IN (
              SELECT program_id
              FROM program_tree
              WHERE tree_type = 'leaf'
            )
          ) AS children_count
        `;
    }

    query += `
        FROM program p
        LEFT JOIN institution i ON p.inst_id = i.inst_id
        WHERE 1=1
    `;



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

    if (typeof flag_valid === "boolean") {
        query += ` AND p.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    if (tree_type) {
        query += ` AND p.tree_type = $${index++}`;
        values.push(tree_type);
    }

    if (inst_type) {
        query += ` AND i.inst_type = $${index++}`;
        values.push(inst_type);
    }

    if (parent_ids) {
        query += ` AND p.parent_id = $${index++}`;
        values.push(parent_ids);
    }

    // if (children_count) {
    //     query += ' GROUP BY p.program_id, i.inst_type \n'
    // } else {
    //     query += ' GROUP BY p.program_id, i.inst_type \n'
    // }

    query += ' GROUP BY p.program_id, i.inst_type \n'

    if (sort_by) {
        const order = sort_order && (sort_order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sort_by} ${order} \n`;
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
};

export const createProgram = async (req: Request<{}, {}, programFields>, res: Response) => {
    const {
        inst_id,
        program_name,
        program_type,
        parent_id,
        remark,
        tree_type,
    } = req.body;

    if (!inst_id || !program_name || !program_type || !tree_type) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO program (inst_id, program_name, program_type, parent_id, remark, tree_type, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`;
    const values = [inst_id, program_name, program_type, parent_id, remark, tree_type];

    console.log(query);
    console.log(values);

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "Program created successfully!" });
        return;
    }

    catch (error) {
        res.status(500).json({ success: false, message: "Error creating program", error });
        return;
    }
};

export const updateProgram = async (req: Request<{}, {}, programFields>, res: Response) => {
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