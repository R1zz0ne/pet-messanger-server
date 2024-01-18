import jwt, { JwtPayload } from "jsonwebtoken";
import 'dotenv/config'
import db from "../db";

declare module "jsonwebtoken" {
    export interface JwtPayload {
        id: number;
        email: string;
        isActivated: boolean;
    }
}

class TokenService {
    generateTokens(payload: object) {
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '30m' })
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' })
        return {
            accessToken,
            refreshToken
        }
    }

    async saveToken(userId: number, refreshToken: string) {
        const tokenData = await db.query('SELECT userid FROM tokens WHERE userid=$1', [userId]);
        if (tokenData.rowCount && tokenData.rowCount > 0) {
            return await db.query('UPDATE tokens set refreshtoken=$1 WHERE userid=$2', [refreshToken, userId])
        }
        return await db.query('INSERT INTO tokens (userid, refreshtoken) VALUES ($1, $2)', [userId, refreshToken])
    }

    async removeToken(refreshToken: string) {
        return await db.query('DELETE FROM tokens WHERE refreshtoken=$1', [refreshToken])
    }

    async findToken(refreshToken: string) {
        return await db.query('SELECT * FROM tokens WHERE refreshtoken=$1', [refreshToken])
    }

    validateAccessToken(token: string) {
        try {
            const userData = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
            return userData;
        } catch (error) {
            return null;
        }
    }

    validateRefreshToken(token: string) {
        try {
            const userData = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
            return userData;
        } catch (error) {
            return null;
        }
    }

    checkAuthUser(token: string) {
        try {
            const userData = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
            return userData;
        } catch (error) {
            return null;
        }
    }
}

export default new TokenService();