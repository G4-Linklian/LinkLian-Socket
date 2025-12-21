import { Request, Response } from 'express';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
import { error } from 'console';
import { userFields } from '../interface/user.interface';

export const getUser = async (req: Request<{}, {}, userFields>, res: Response) => {

    const {
        user_sys_id,
        user_first_name,
        user_last_name,
        username,
        org_id,
        role_id,
        phone,
        email,
    } = req.body

    if (
        !user_sys_id &&
        !user_first_name &&
        !user_last_name &&
        !username &&
        !org_id &&
        !role_id &&
        !phone &&
        !email) {
        res.status(400).json({ success: false, message: "No value input!" });
    }

    // console.log(req.body)

    let query = ``;

    query += 'SELECT * FROM user_sys us \n'
    query += 'LEFT JOIN role r ON r.role_id = us.role_id \n'
    query += 'LEFT JOIN org o ON o.org_id = us.org_id \n'
    query += 'WHERE us.user_sys_id > 0 \n'

    const values: any[] = [];
    let index = 1;

    if (user_sys_id) {
        query += ` AND us.user_sys_id = $${index++}`;
        values.push(user_sys_id);
    }
    if (user_first_name) {
        query += ` AND us.user_first_name = $${index++}`;
        values.push(user_first_name);
    }
    if (user_last_name) {
        query += ` AND us.user_last_name = $${index++}`;
        values.push(user_last_name);
    }
    if (username) {
        query += ` AND us.username = $${index++}`;
        values.push(username);
    }
    if (org_id) {
        query += ` AND us.org_id = $${index++}`;
        values.push(org_id);
    }
    if (role_id) {
        query += ` AND us.role_id = $${index++}`;
        values.push(role_id);
    }
    if (phone) {
        query += ` AND us.phone = $${index++}`;
        values.push(phone);
    }
    if (email) {
        query += ` AND us.email = $${index++}`;
        values.push(email);
    }

    console.log(query)


    try {
        const data = await queryPostgresDB(query, globalSmartGISConfig);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ success: false, message: 'Error fetching data' });
    }
};

