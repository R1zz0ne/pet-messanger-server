import PGInterface from '../PGInterface';

interface Dialogs {
    id: number,
    userid: number,
    email: string
}


class DialogService {
    async getDialogs(id: number) { //Проверено
        const dialogsId: Pick<Dialogs, 'id'>[] = await PGInterface.select({
            fields: ['id', 'name'],
            table: 'dialog',
            join: [{
                type: 'INNER JOIN',
                table: 'link_dialog_user',
                firstId: 'dialog.id',
                secondId: 'link_dialog_user.dialogid'
            }],
            condition: `userid = ${id}`
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
            condition: `dialog.id IN (${dialogsIdArray.join(',')}) AND userid != ${id}`
        })
        return dialogs;
    }

    async setDialog(users: number[]) { //Проверено
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
                    throw new Error();
                }
            }
            return dialog[0];
        } else {
            throw new Error();
        }
    }
}

export default new DialogService();