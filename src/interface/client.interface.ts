export interface ClientInfo {
    socket: WebSocket;
    userID: string;
    conversationID?: string;
    isOnline: boolean;
}