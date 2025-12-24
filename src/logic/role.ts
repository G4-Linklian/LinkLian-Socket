// import { Request, Response } from 'express';
// import { queryPostgresDB, globalSmartGISConfig } from '../config/db';
// import { error } from 'console';
// import { roleFields } from '../interface/role.interface';

// // export const getRole = async (req: Request<{}, {}, roleFields>, res: Response) => {

//     const {
//         role_id,
//         role_name,
//         role_type,
//         access,
//         created_at,
//         updated_at,
//         flag_valid,
//     } = req.body

    if (
        !role_id &&
        !role_name &&
        !role_type &&
        !access &&
        !created_at &&
        !updated_at &&
        !(typeof flag_valid === "boolean")) {
        res.status(400).json({ success: false, message: "No value input!" });
    }

//     // console.log(req.body)

//     let query = ``;

//     query += 'SELECT * FROM role r \n'
//     query += 'WHERE 1=1 \n'

//     const values: any[] = [];
//     let index = 1;

    if (role_id) {
        query += ` AND r.role_id = $${index++}`;
        values.push(role_id);
    }
    if (role_name) {
        query += ` AND r.role_name = $${index++}`;
        values.push(role_name);
    }
    if (role_type) {
        query += ` AND r.role_type = $${index++}`;
        values.push(role_type);
    }
    if (access) {
        query += ` AND r.access = $${index++}`;
        values.push(access);
    }
    if (created_at) {
        query += ` AND r.created_at = $${index++}`;
        values.push(created_at);
    }
    if (updated_at) {
        query += ` AND r.updated_at = $${index++}`;
        values.push(updated_at);
    }
    if (typeof flag_valid === "boolean") {
        query += ` AND r.flag_valid = $${index++}`;
        values.push(flag_valid);
    }

//     console.log(query)
//     console.log(values);

//     try {
//         const data = await queryPostgresDB(query, globalSmartGISConfig, values);
//         res.status(200).json({ success: true, data });
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         res.status(500).json({ success: false, message: 'Error fetching data' });
//     }
// };


// export const createRole = async (req: Request<{}, {}, roleFields>, res: Response) => {

//   const {
//     role_name,
//     role_type,
//     access,
//     flag_valid
//   } = req.body;

//   if (!role_name || !role_type || !access) {
//     return res.status(400).json({
//       success: false,
//       message: "Missing required fields"
//     });
//   }

//   let query = `
//     INSERT INTO role (
//       role_name,
//       role_type,
//       access,
//       flag_valid,
//       created_at,
//       updated_at
//     )
//     VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW())
//     RETURNING *;
//   `;

//   const values = [
//     role_name,
//     role_type,
//     JSON.stringify(access),
//     flag_valid ?? true
//   ];

//   console.log(query);
//   console.log(values);

//   try {
//     const data = await queryPostgresDB(query, globalSmartGISConfig, values);

//     res.status(201).json({success: true, data});

//   } catch (error) {
//     console.error("Error creating role:", error);
//     res.status(500).json({success: false, message: "Error creating role"});
//   }
// };


// export const updateRole = async (req: Request<{}, {}, roleFields>, res: Response) => {

//   const {
//     role_id,
//     role_name,
//     role_type,
//     access,
//     flag_valid
//   } = req.body;

//   if (!role_id) {
//     return res.status(400).json({success: false, message: "role_id is required"});
//   }

//   if (
//     !role_name &&
//     !role_type &&
//     !access &&
//     flag_valid === undefined
//   ) {
//     return res.status(400).json({success: false, message: "No fields to update"});
//   }

//   let query = `UPDATE role SET `;

//   const values: any[] = [];
//   let index = 1;
//   const updates: string[] = [];

//   if (role_name) {
//     updates.push(`role_name = $${index++}`);
//     values.push(role_name);
//   }

//   if (role_type) {
//     updates.push(`role_type = $${index++}`);
//     values.push(role_type);
//   }

//   if (access) {
//     updates.push(`access = $${index++}::jsonb`);
//     values.push(JSON.stringify(access));
//   }

//   if (flag_valid !== undefined) {
//     updates.push(`flag_valid = $${index++}`);
//     values.push(flag_valid);
//   }

//   updates.push(`updated_at = NOW()`);

//   query += updates.join(', ');
//   query += ` WHERE role_id = $${index}`;
//   values.push(role_id);

//   query += ` RETURNING *;`;

//   console.log(query);
//   console.log(values);

//   try {
//     const data = await queryPostgresDB(query, globalSmartGISConfig, values);

//     if (data.length === 0) {
//       return res.status(404).json({success: false, message: "Role not found"});
//     }

//     res.status(200).json({success: true, data});

//   } catch (error) {
//     console.error("Error updating role:", error);
//     res.status(500).json({success: false, message: "Error updating role"});
//   }
// };


