import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { roomLocationFields } from '../interface/roomLocation.interface';

export const getRoomLocation = async (req: Request<{}, {}, roomLocationFields>, res: Response) => {

    const {
        room_location_id,
        inst_id,
        building_no,
        room,
        remark,
        flag_valid,
    } = req.body

    if (
        !room_location_id &&
        !inst_id &&
        !building_no &&
        !room &&
        !remark &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM room_location rl \n'
    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (room_location_id) {
        query += ` AND rl.room_location_id = $${index++}`;
        values.push(room_location_id);
    }

    if (inst_id) {
        query += ` AND rl.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (building_no) {
        query += ` AND rl.building_no = $${index++}`;
        values.push(building_no);
    }

    if (room) {
        query += ` AND rl.room = $${index++}`;
        values.push(room);
    }

    if (remark) {
        query += ` AND rl.remark = $${index++}`;
        values.push(remark);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND rl.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};

export const createRoomLocation = async (req: Request<{}, {}, roomLocationFields>, res: Response) => {
    const {
        inst_id,
        building_no,
        room,
        remark,
        flag_valid,
    } = req.body;

    if (!inst_id || !building_no || !room || typeof flag_valid !== "boolean") {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO room_location (inst_id, building_no, room, remark, flag_valid) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const values = [inst_id, building_no, room, remark, flag_valid];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};

export const updateRoomLocation = async (req: Request<{}, {}, roomLocationFields>, res: Response) => {
    const {
        room_location_id,
        inst_id,
        building_no,
        room,
        remark,
        flag_valid,
    } = req.body;

    if (!room_location_id) {
        res.status(400).json({ success: false, message: "room_location_id is required!" });
        return;
    }

    const updates = [];
    const values: any[] = [];
    let index = 1;

    if (inst_id) {
        updates.push(`inst_id = $${index++}`);
        values.push(inst_id);
    }

    if (building_no) {
        updates.push(`building_no = $${index++}`);
        values.push(building_no);
    }

    if (room) {
        updates.push(`room = $${index++}`);
        values.push(room);
    }

    if (remark) {
        updates.push(`remark = $${index++}`);
        values.push(remark);
    }

    if (typeof flag_valid === "boolean") {
        updates.push(`flag_valid = $${index++}`);
        values.push(flag_valid);
    }

    if (updates.length === 0) {
        res.status(400).json({ success: false, message: "No fields to update!" });
        return;
    }

    values.push(room_location_id);

    const query = `UPDATE room_location SET ${updates.join(", ")} WHERE room_location_id = $${index} RETURNING *;`;

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};


