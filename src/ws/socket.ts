import { WebSocketServer, WebSocket } from 'ws';
import { queryPostgresDB, globalSmartGISConfig } from '../config/db';

interface ClientInfo {
    socket: WebSocket;
    userID: string;
    conversationID?: string;
    isOnline: boolean;
}

const clients: ClientInfo[] = [];

// ตอนใช้จริงประยุกต์ใช้กับ DB query จริง
async function handleChat(ws: WebSocket, payload: any, client: ClientInfo) {
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

export function sendNotificationToUser(targetUserID: string, notiData: any) {
    const targetClient = clients.find(c => c.userID === targetUserID);

    if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
        targetClient.socket.send(JSON.stringify({
            type: 'NOTIFICATION',
            data: notiData
        }));
        console.log(`🔔 Notification sent to user ${targetUserID}`);
    } else {
        console.log(`User ${targetUserID} is offline. Notification maybe saved to DB.`);
    }
}

// --- Main Setup ---
export function setupWebSocket(server: any) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        let clientInfo: ClientInfo | null = null;

        ws.on('message', async (data: any) => {
            try {
                const msg = JSON.parse(data.toString());
                const { type, payload } = msg;

                // Routing ตาม Type
                switch (type) {
                    case 'JOIN_ROOM': // เข้าห้องแชท
                        // payload: { userID, conversationID }
                        clientInfo = {
                            socket: ws,
                            userID: payload.userID,
                            conversationID: payload.conversationID,
                            isOnline: true
                        };

                        // เช็คว่ามี user เดิมอยู่ไหม ถ้ามีให้ update หรือ push ใหม่
                        const existingIdx = clients.findIndex(c => c.userID === payload.userID);
                        if (existingIdx !== -1) {
                            clients[existingIdx] = clientInfo;
                        } else {
                            clients.push(clientInfo);
                        }
                        console.log(`User ${payload.userID} joined room ${payload.conversationID}`);
                        break;

                    case 'REGISTER_NOTI': // ต่อ Socket เพื่อรอรับ Noti อย่างเดียว (ไม่ได้เข้าหน้าแชท)
                        clientInfo = {
                            socket: ws,
                            userID: payload.userID,
                            isOnline: true
                        };
                        clients.push(clientInfo);
                        break;

                    case 'CHAT_SEND':
                        if (clientInfo) await handleChat(ws, payload, clientInfo);
                        break;

                    case 'READ_NOTI':
                        // Logic update DB ว่าอ่านแจ้งเตือนแล้ว
                        console.log("User read notification");
                        break;

                    default:
                        console.warn('Unknown message type:', type);
                }

            } catch (error) {
                console.error('WebSocket Parse Error:', error);
            }
        });

        ws.on('close', () => {
            if (clientInfo) {
                const index = clients.indexOf(clientInfo);
                if (index !== -1) clients.splice(index, 1);
                console.log(`Client ${clientInfo.userID} disconnected`);
            }
        });
    });

    console.log("WebSocket server is running with Multi-feature support");
}