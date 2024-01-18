import { QueryResult } from "pg";
import db from "../db";

class MessageService {
    async getMessages(idDialog: string) {
        const messages: QueryResult = await db.query(`SELECT sender AS userId, email, message FROM messages
        INNER JOIN users
        ON users.id = messages.sender
        WHERE dialogid = $1`, [idDialog])
        return messages.rows;
    }

    async setMessage(idDialog: string, idUser: number, message: string) {
        const messageResponse = await db.query(`INSERT INTO messages (dialogid, sender, message) 
        VALUES ($1, $2, $3)`, [idDialog, idUser, message]);
        console.log(messageResponse);

    }
}

export default new MessageService();