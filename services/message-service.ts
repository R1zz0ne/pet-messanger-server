import PGInterface from "../PGInterface";

interface IMessage {
    id: number,
    userid: number,
    email: string,
    message: string
}

class MessageService {
    async getMessages(idDialog: string) { //Проверено
        const messages: IMessage[] = await PGInterface.customQuery(`SELECT * FROM (
            SELECT messages.id AS id, message, email, sender AS userid
            FROM messages 
            INNER JOIN users ON users.id = messages.sender
            WHERE dialogid = ${idDialog}
            ORDER BY id DESC
            LIMIT 100
            ) t ORDER BY id ASC`)
        return messages;
    }

    async setMessage(idDialog: string, idUser: number, message: string) { //Проверено
        const messageResponse = await PGInterface.insert({
            table: 'messages',
            fields: ['dialogid', 'sender', 'message'],
            values: [idDialog, idUser, `'${message}'`]
        })
    }
}

export default new MessageService();