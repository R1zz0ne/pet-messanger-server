import db from '../db';
import { QueryResult } from 'pg';

interface Dialogs {
    id: number,
    userid: number,
    email: string
}

class DialogService {
    async getDialogs(id: number) {
        const dialogsId: QueryResult<Pick<Dialogs, 'id'>> = await db.query(`SELECT id, name FROM dialog
            INNER JOIN link_dialog_user
            ON dialog.id = link_dialog_user.dialogid
            WHERE userid = $1`, [id]);
        const dialogsIdArray: number[] = [];
        dialogsId.rows.forEach((el) => {
            dialogsIdArray.push(el.id);
        });
        const dialogs: QueryResult<Dialogs> = await db.query(`SELECT dialog.id, userid, email FROM dialog
        INNER JOIN link_dialog_user
        ON dialog.id = link_dialog_user.dialogid
        INNER JOIN users
        ON link_dialog_user.userid = users.id
        WHERE dialog.id IN (${dialogsIdArray.join(',')}) AND userid !=$1`, [id])
        return dialogs.rows;
    }

    async setDialog(users: number[]) {
        const dialog = await db.query(`INSERT INTO dialog (name) VALUES ('notused') RETURNING id`);
        if (dialog.rows.length > 0) {
            const userLength = users.length;
            for (let i = 0; i < userLength; i++) {
                const dialogLink = await db.query(`INSERT INTO link_dialog_user (dialogid, userid) 
                VALUES ($1, $2) RETURNING userid`, [dialog.rows[0].id, users[i]]);
                if (dialogLink.rows.length <= 0) {
                    await db.query(`DELETE FROM link_dialog_user
                    WHERE dialogid=$1`, [dialog.rows[0].id]);
                    await db.query(`DELETE FROM dialog WHERE id=$1`, [dialog.rows[0].id]);
                    throw new Error();
                }
            }
            return dialog.rows[0];
        } else {
            throw new Error();
        }
    }
}

export default new DialogService();