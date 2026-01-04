export const generateUpdateQuery = (
    tableName: string,
    whereField: string,
    whereValue: any,
    data: Record<string, any>,
    allowedFields: string[],
    hasTimestamp: boolean = false
) => {
    const keys = Object.keys(data).filter((key) => allowedFields.includes(key) && data[key] !== undefined);

    if (keys.length === 0) return null;

    let paramIndex = 1;
    const setClauses = keys.map((key) => `${key} = $${paramIndex++}`);

    if (hasTimestamp) {
        setClauses.push(`updated_at = NOW()`);
    }

    const query = `
        UPDATE ${tableName} 
        SET ${setClauses.join(', ')} 
        WHERE ${whereField} = $${paramIndex} 
        RETURNING *;
    `;

    const values = [...keys.map((key) => data[key]), whereValue];

    return { query, values };
};