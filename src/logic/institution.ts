import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { institutionFields } from '../interface/institution.interface';
import { hashPasswordWithSalt, verifyPasswordWithSalt, JWTToken, emailInstChecker } from '../utils/auth.function';

export const getInstitution = async (req: Request<{}, {}, institutionFields>, res: Response) => {
    const {
        inst_id,
        inst_email,
        inst_name_th,
        inst_name_en,
        inst_abbr_th,
        inst_abbr_en,
        inst_type,
        approve_status,
        flag_valid,
    } = req.body

    if (
        !inst_id &&
        !inst_email &&
        !inst_name_th &&
        !inst_name_en &&
        !inst_abbr_th &&
        !inst_abbr_en &&
        !inst_type &&
        !approve_status &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
        return;
    }

    let query = ``;

    query += 'SELECT * FROM institution i \n'

    query += 'WHERE 1=1 \n'

    const values: any[] = [];
    let index = 1;

    if (inst_id) {
        query += ` AND i.inst_id = $${index++}`;
        values.push(inst_id);
    }

    if (inst_email) {
        query += ` AND i.inst_email = $${index++}`;
        values.push(inst_email);
    }

    if (inst_name_th) {
        query += ` AND i.inst_name_th = $${index++}`;
        values.push(inst_name_th);
    }

    if (inst_name_en) {
        query += ` AND i.inst_name_en = $${index++}`;
        values.push(inst_name_en);
    }

    if (inst_abbr_th) {
        query += ` AND i.inst_abbr_th = $${index++}`;
        values.push(inst_abbr_th);
    }

    if (inst_abbr_en) {
        query += ` AND i.inst_abbr_en = $${index++}`;
        values.push(inst_abbr_en);
    }

    if (inst_type) {
        query += ` AND i.inst_type = $${index++}`;
        values.push(inst_type);
    }

    if (approve_status) {
        query += ` AND i.approve_status = $${index++}`;
        values.push(approve_status);
    }

    if (typeof flag_valid === "boolean") {
        query += ` AND i.flag_valid = $${index++}`;
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
}

export const createInstitution = async (req: Request<{}, {}, institutionFields>, res: Response) => {
    const {
        inst_email,
        inst_password,
        inst_name_th,
        inst_name_en,
        inst_abbr_th,
        inst_abbr_en,
        inst_type,
        inst_phone,
        website,
        address,
        subdistrict,
        district,
        province,
        postal_code,
        logo_url,
        docs_url,
    } = req.body;

    if (!inst_email || !inst_password || !inst_name_th || !inst_name_en || !inst_abbr_th || !inst_abbr_en || !inst_type || !inst_phone || !website || !address || !subdistrict || !district || !province || !postal_code || !logo_url || !docs_url) {
        res.status(400).json({ success: false, message: "Missing required fields!" });
        return;
    }

    const emailExists = await emailInstChecker(inst_email);
    if (emailExists) {
        res.status(400).json({ success: false, message: "Email already exists!" });
        return;
    }

    const hashedPassword = await hashPasswordWithSalt(inst_password);

    const query = `
        INSERT INTO institution 
        (
            inst_email, inst_password, inst_name_th, inst_name_en, inst_abbr_th, inst_abbr_en, inst_type, inst_phone, website, address, subdistrict, district, province, postal_code, logo_url, docs_url, approve_status, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
    `;
    const values = [inst_email, hashedPassword, inst_name_th, inst_name_en, inst_abbr_th, inst_abbr_en, inst_type, inst_phone, website, address, subdistrict, district, province, postal_code, logo_url, docs_url, "pending"];


    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(201).json({ success: true, message: "Institution created successfully!" });
        return;
    } catch (error) {
        console.error('Error creating institution:', error);
        res.status(500).json({ success: false, message: 'Error creating institution' });
        return;
    }
};

export const updateInstitution = async (req: Request<{}, {}, institutionFields>, res: Response) => {
    const {
        inst_id,
        inst_email,
        inst_password,
        inst_name_th,
        inst_name_en,
        inst_abbr_th,
        inst_abbr_en,
        inst_type,
        inst_phone,
        website,
        address,
        subdistrict,
        district,
        province,
        postal_code,
        logo_url,
        docs_url,
        approve_status,
        flag_valid
    } = req.body;

    if (!inst_id) {
        res.status(400).json({ success: false, message: "Institution ID is required for update!" });
        return;
    }

    let query = `UPDATE institution SET`;
    const values: any[] = [];
    let index = 1;

    if (inst_email) {
        query += ` inst_email = $${index++},`;
        values.push(inst_email);
    }
    if (inst_password) {
        query += ` inst_password = $${index++},`;
        values.push(inst_password);
    }
    if (inst_name_th) {
        query += ` inst_name_th = $${index++},`;
        values.push(inst_name_th);
    }
    if (inst_name_en) {
        query += ` inst_name_en = $${index++},`;
        values.push(inst_name_en);
    }
    if (inst_abbr_th) {
        query += ` inst_abbr_th = $${index++},`;
        values.push(inst_abbr_th);
    }
    if (inst_abbr_en) {
        query += ` inst_abbr_en = $${index++},`;
        values.push(inst_abbr_en);
    }
    if (inst_type) {
        query += ` inst_type = $${index++},`;
        values.push(inst_type);
    }
    if (inst_phone) {
        query += ` inst_phone = $${index++},`;
        values.push(inst_phone);
    }
    if (website) {
        query += ` website = $${index++},`;
        values.push(website);
    }
    if (address) {
        query += ` address = $${index++},`;
        values.push(address);
    }
    if (subdistrict) {
        query += ` subdistrict = $${index++},`;
        values.push(subdistrict);
    }
    if (district) {
        query += ` district = $${index++},`;
        values.push(district);
    }
    if (province) {
        query += ` province = $${index++},`;
        values.push(province);
    }
    if (postal_code) {
        query += ` postal_code = $${index++},`;
        values.push(postal_code);
    }
    if (logo_url) {
        query += ` logo_url = $${index++},`;
        values.push(logo_url);
    }
    if (docs_url) {
        query += ` docs_url = $${index++},`;
        values.push(docs_url);
    }
    if (approve_status) {
        query += ` approve_status = $${index++},`;
        values.push(approve_status);
    }
    if (typeof flag_valid === "boolean") {
        query += ` flag_valid = $${index++},`;
        values.push(flag_valid);
    }

    query = query.slice(0, -1);
    query += ` WHERE inst_id = $${index}`;
    values.push(inst_id);

    try {
        await queryPostgresDB(query, globalSmartGISConfig, values);
        res.status(200).json({ success: true, message: "Institution updated successfully!" });
        return;
    } catch (error) {
        console.error('Error updating institution:', error);
        res.status(500).json({ success: false, message: 'Error updating institution' });
        return;
    }
};

export const loginInstitution = async (req: Request<{}, {}, institutionFields>, res: Response) => {
    const {
        inst_email,
        inst_password
    } = req.body;

    if (!inst_email || !inst_password) {
        res.status(400).json({ success: false, message: "Institution email and password are required for verification!" });
        return;
    }

    try {

        const instQuery =
            `SELECT inst.* 
                FROM institution inst
                WHERE inst.inst_email = $1
            LIMIT 1`;
        const instValues = [inst_email];
        const instData = await queryPostgresDB(instQuery, globalSmartGISConfig, instValues);


        if (instData.length === 0) {
            res.status(401).json({ success: false, message: "Institution not found" });
            return;
        }

        const institution = instData[0];
        const isMatch = await verifyPasswordWithSalt(inst_password, institution.inst_password)

        if (!isMatch) {
            res.status(401).json({ success: false, message: "Incorrect password" });
            return;
        }

        const { inst_password: _, ...institutionData } = institution;

        const token = await JWTToken({ institution: institutionData }, require('jsonwebtoken'))

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            institution: institutionData.inst_email,
        });
        return;
    } catch (error) {
        console.error('Error verifying institution:', error);
        res.status(500).json({ success: false, message: 'Error verifying institution' });
        return;
    }

};
