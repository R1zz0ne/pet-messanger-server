import PGInterface from "../PGInterface";
import ApiError from "../execptions/api-error";
import tokenService from "../services/token-service";

interface Dialogs {
    id: number,
    userid: number,
    email: string
}

interface IMessage {
    id: number,
    userid: number,
    email: string,
    message: string
}

class WSDialogController {
    async getDialogs(accessToken: string) {
        const userData = tokenService.checkAuthUser(accessToken);
        if (!userData) {
            throw ApiError.UnauthorizedError()
        }
        const dialogsId: Pick<Dialogs, 'id'>[] = await PGInterface.select({
            fields: ['id', 'name'],
            table: 'dialog',
            join: [{
                type: 'INNER JOIN',
                table: 'link_dialog_user',
                firstId: 'dialog.id',
                secondId: 'link_dialog_user.dialogid'
            }],
            condition: `userid = ${userData.id}`
        })
        if (dialogsId.length === 0) {
            return [];
        }
        const dialogsIdArray: number[] = [];
        dialogsId.forEach((el) => {
            dialogsIdArray.push(el.id);
        });
        const dialogs: Dialogs[] = await PGInterface.select({
            fields: ['dialog.id', 'userid', 'email'],
            table: 'dialog',
            join: [{
                type: 'INNER JOIN',
                table: 'link_dialog_user',
                firstId: 'dialog.id',
                secondId: 'link_dialog_user.dialogid'
            }, {
                type: 'INNER JOIN',
                table: 'users',
                firstId: 'link_dialog_user.userid',
                secondId: 'users.id'
            }],
            condition: `dialog.id IN (${dialogsIdArray.join(',')}) AND userid != ${userData.id}`
        })
        return dialogs;
    }
    async setDialog(accessToken: string, secondUser: number) {
        // const token = accessToken.split(' ')[1];
        const userData = tokenService.checkAuthUser(accessToken);
        if (!userData) {
            throw ApiError.UnauthorizedError()
        }
        const users = [userData.id, secondUser] //TODO: заглушка при переписывании сервера
        const dialog: Pick<Dialogs, 'id'>[] = await PGInterface.insert({
            table: 'dialog',
            fields: ['name'],
            values: [`'notused'`],
            returns: ['id']
        })
        if (dialog.length > 0) {
            const userLength = users.length;
            for (let i = 0; i < userLength; i++) {
                const dialogLink: Pick<Dialogs, 'userid'>[] = await PGInterface.insert({
                    table: 'link_dialog_user',
                    fields: ['dialogid', 'userid'],
                    values: [dialog[0].id, users[i]],
                    returns: ['userid']
                })
                if (dialogLink.length = 0) {
                    await PGInterface.delete({
                        table: 'link_dialog_user',
                        condition: `dialogid=${dialog[0].id}`
                    })
                    await PGInterface.delete({
                        table: 'dialog',
                        condition: `id=${dialog[0].id}`
                    })
                    throw new Error('Ошибка отправки сообщения (создания диалога)');
                }
            }
            const getUser: { email: string }[] = await PGInterface.select({
                fields: ['email'],
                table: 'users',
                condition: `id = ${secondUser}`
            })
            console.log({ //TODO: убрать
                id: dialog[0].id,
                userid: secondUser,
                email: getUser[0].email
            });
            return {
                id: dialog[0].id,
                userid: secondUser,
                email: getUser[0].email
            };
        } else {
            throw new Error();
        }
    }
    async getMessages(data: any) {
        if (!data.id) {
            throw ApiError.BadRequest('idDialog не указан')
        }
        const messages: IMessage[] = await PGInterface.customQuery(`SELECT * FROM (
            SELECT messages.id AS id, dialogid, message, email, sender AS userid
            FROM messages 
            INNER JOIN users ON users.id = messages.sender
            WHERE dialogid = ${data.id}
            ORDER BY id DESC
            LIMIT 100
            ) t ORDER BY id ASC`)
        return messages;
    }
    async setMessage(accessToken: string, data: any) {
        const userData = tokenService.checkAuthUser(accessToken);
        if (!userData) {
            throw ApiError.UnauthorizedError()
        }
        // const messageResponse = await PGInterface.insert({
        //     table: 'messages',
        //     fields: ['dialogid', 'sender', 'message'],
        //     values: [data.id, userData.id, `'${data.message}'`]
        // })
        const messageResponse = await PGInterface.customQuery(`WITH mess AS (
            INSERT INTO messages (dialogid, sender, message)
            VALUES (${data.id}, ${userData.id}, '${data.message}')
            RETURNING id, dialogid, sender, message
          )
          SELECT mess.id, mess.dialogid, mess.message, users.email, mess.sender AS userid
          FROM mess
          JOIN users ON mess.sender = users.id;`)
        return messageResponse[0];
    }
}

export default new WSDialogController();