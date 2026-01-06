import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { buildingFields } from '../interface/building.interface';

export const getBuilding = async (req: Request<{}, {}, buildingFields>, res: Response) => {

    const {
        building_id,
        inst_id,
        building_no,
        building_name,
        remark,
        flag_valid,
    } = req.body

    if (
        !building_id &&
        !inst_id &&
        !building_no &&
        !building_name &&
        !remark &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM building b \n'
    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (building_id) {
        query += ` AND b.building_id = $${index++}`;
        values.push(building_id);
    }

    if (inst_id) {
        query += ` AND b.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (building_no) {
        query += ` AND b.building_no = $${index++}`;
        values.push(building_no);
    }

    if (building_name) {
        query += ` AND b.building_name = $${index++}`;
        values.push(building_name);
    }

    if (remark) {
        query += ` AND b.remark = $${index++}`;
        values.push(remark);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND b.flag_valid = $${index++}`;
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

export const createBuilding = async (req: Request<{}, {}, buildingFields>, res: Response) => {
    const {
        inst_id,
        building_no,
        building_name,
        remark,
    } = req.body;

    if (!inst_id || !building_no || !building_name) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO building (inst_id, building_no, building_name, remark, flag_valid) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const values = [inst_id, building_no, building_name, remark, true];
    
    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};

export const updateBuilding = async (req: Request<{}, {}, buildingFields>, res: Response) => {
    const {
        building_id,
        inst_id,
        building_no,
        building_name,
        remark,
        flag_valid,
        room_format,
    } = req.body;

    if (!building_id) {
        res.status(400).json({ success: false, message: "building_id is required!" });
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

    if (building_name) {
        updates.push(`building_name = $${index++}`);
        values.push(building_name);
    }

    if (remark) {
        updates.push(`remark = $${index++}`);
        values.push(remark);
    }

    if (typeof flag_valid === "boolean") {
        updates.push(`flag_valid = $${index++}`);
        values.push(flag_valid);
    }

    if (room_format) {
        updates.push(`room_format = $${index++}`);
        values.push(room_format);
    }

    if (updates.length === 0) {
        res.status(400).json({ success: false, message: "No fields to update!" });
        return;
    }

    values.push(building_id);

    const query = `UPDATE building SET ${updates.join(", ")} WHERE building_id = $${index} RETURNING *;`;

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};


export const getRoomLocation = async (req: Request<{}, {}, buildingFields>, res: Response) => {

    const {
        room_location_id,
        building_id,
        room_number,
        room_remark,
        flag_valid,
        floor,
        sort_by,
        sort_order,
        limit,
        offset,
    } = req.body

    if (
        !room_location_id &&
        !building_id &&
        !room_number &&
        !room_remark &&
        !floor &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT *, COUNT(*) OVER() as total_count FROM room_location rl \n'
    query += 'LEFT JOIN building b ON rl.building_id = b.building_id \n'
    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (room_location_id) {
        query += ` AND rl.room_location_id = $${index++}`;
        values.push(room_location_id);
    }

    if (building_id) {
        query += ` AND rl.building_id = $${index++}`;
        values.push(building_id);
    }

    if (room_number) {
        query += ` AND rl.room_number = $${index++}`;
        values.push(room_number);
    }

    if (floor) {
        query += ` AND rl.floor = $${index++}`;
        values.push(floor);
    }

    if (room_remark) {
        query += ` AND rl.room_remark = $${index++}`;
        values.push(room_remark);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND rl.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

        if (sort_by) {
        const order = sort_order && (sort_order.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
        query += ` ORDER BY rl.${sort_by} ${order} \n`;
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
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};

export const createRoomLocation = async (req: Request<{}, {}, buildingFields>, res: Response) => {
    const {
        building_id,
        room_number,
        room_remark,
        floor,
    } = req.body;

    if (!building_id || !room_number || !floor) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const query = `INSERT INTO room_location (building_id, room_number, room_remark, floor, flag_valid) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const values = [building_id, room_number, room_remark, floor, true];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};

export const createRoomLocationBatch = async (req: Request<{}, {}, buildingFields[]>, res: Response) => {

    const rooms = req.body;

    // Validation เบื้องต้น
    if (!Array.isArray(rooms) || rooms.length === 0) {
        res.status(400).json({ success: false, message: "Input data must be a non-empty array!" });
        return;
    }

    // ตรวจสอบว่ามี field สำคัญครบไหมในทุก items
    const isValid = rooms.every(room => room.building_id && room.room_number && room.floor);
    if (!isValid) {
        res.status(400).json({ success: false, message: "Missing required fields in some items!" });
        return;
    }

    try {
        // เตรียมตัวแปรสำหรับ Dynamic Query
        const valueList: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        rooms.forEach((room) => {
            // Push ค่าลงใน array รวม (Flatten array)
            valueList.push(
                room.building_id,
                room.room_number,
                room.room_remark || "", 
                room.floor,
                true 
            );

            placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
            
            paramIndex += 5;
        });

        const query = `
            INSERT INTO room_location (building_id, room_number, room_remark, floor, flag_valid) 
            VALUES ${placeholders.join(", ")} 
            RETURNING *;
        `;

        const result = await queryPostgresDB(query, globalSmartGISConfig, valueList);
        
        res.status(201).json({ 
            success: true, 
            message: `Created ${result.length} rooms successfully`,
            data: result 
        });

    } catch (error) {
        console.error("Batch insert error:", error);
        res.status(500).json({ success: false, message: "Server Error", error });
    }
};

export const updateRoomLocation = async (req: Request<{}, {}, buildingFields>, res: Response) => {
    const {
        room_location_id,
        building_id,
        room_number,
        room_remark,
        floor,
        flag_valid,
    } = req.body;

    if (!room_location_id) {
        res.status(400).json({ success: false, message: "room_location_id is required!" });
        return;
    }

    const updates = [];
    const values: any[] = [];
    let index = 1;

    if (building_id) {
        updates.push(`building_id = $${index++}`);
        values.push(building_id);
    }
    
    if (room_number) {
        updates.push(`room_number = $${index++}`);
        values.push(room_number);
    }

    if (floor) {
        updates.push(`floor = $${index++}`);
        values.push(floor);
    }

    if (room_remark) {
        updates.push(`room_remark = $${index++}`);
        values.push(room_remark);
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


export const deleteRoomLocation = async (req: Request<{}, {}, buildingFields>, res: Response) => {
    const {
        room_location_id,
    } = req.body;

    if (!room_location_id) {
        res.status(400).json({ success: false, message: "room_location_id is required!" });
        return;
    }

    const query = `DELETE FROM room_location WHERE room_location_id = $1 RETURNING *;`;
    const values = [room_location_id];

    try {
        const result = await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, data: result });
        return;
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
        return;
    }
};

