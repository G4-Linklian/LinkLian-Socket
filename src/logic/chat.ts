import { ClientInfo } from '../interface/client.interface';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';

// ตอนใช้จริงประยุกต์ใช้กับ DB query จริงๆตรงนี้
export async function handleChat(ws: WebSocket, payload: any, client: ClientInfo, clients: ClientInfo[]) {
    const { message_text, conversationID } = payload;

    // const insertQuery = `
    //     INSERT INTO message (conversation_id, send_by, send_at, message_text)
    //     VALUES ($1, $2, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok', $3)
    //     RETURNING *;
    // `;

    // try {
    //     const dataMessage = await queryPostgresDB(insertQuery, globalSmartGISConfig, [conversationID, client.userID, message_text]);

    //     const messageObj = {
    //         message_id: dataMessage[0].message_id,
    //         message_text,
    //         send_by: client.userID,
    //         conversation_id: conversationID,
    //         send_at: Date.now()
    //     };

    //     // Broadcast เฉพาะคนในห้อง Chat นั้น
    //     clients.forEach((c) => {
    //         if (c.conversationID === conversationID && c.socket.readyState === WebSocket.OPEN) {
    //             c.socket.send(JSON.stringify({
    //                 type: 'CHAT_RECEIVE',
    //                 data: messageObj
    //             }));
    //         }
    //     });
    // } catch (err) {
    //     console.error('❌ Chat Error:', err);
    // }

    const messageObj = {
            message_id: 1,
            message_text,
            send_by: client.userID,
            conversation_id: conversationID,
            send_at: Date.now()
        };

    clients.forEach((c) => {
        if (c.conversationID === conversationID && c.socket.readyState === WebSocket.OPEN) {
            c.socket.send(JSON.stringify({
                type: 'CHAT_RECEIVE',
                data: messageObj
            }));
        }
    });
}
