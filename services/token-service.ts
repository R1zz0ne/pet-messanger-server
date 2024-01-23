import jwt, { JwtPayload } from "jsonwebtoken";
import 'dotenv/config'
import PGInterface from "../PGInterface";

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

    async saveToken(userId: number, refreshToken: string) { //Проверено
        const tokenData = await PGInterface.select({
            table: 'tokens',
            fields: ['userid'],
            condition: `userid=${userId}`
        })
        if (tokenData.length > 0) {
            return await PGInterface.update({
                table: 'tokens',
                set: [`refreshtoken='${refreshToken}'`],
                condition: `userid=${userId}`
            })
        }
        return await PGInterface.insert({ 
            table: 'tokens',
            fields: ['userid', 'refreshtoken'],
            values: [userId, `'${refreshToken}'`]
        })
    }

    async removeToken(refreshToken: string) { //Проверено
        return await PGInterface.delete({ 
            table: 'tokens',
            condition: `refreshtoken='${refreshToken}'`
        })
    }

    async findToken(refreshToken: string) { //Проверено
        return await PGInterface.select({
            table: 'tokens',
            fields: ['*'],
            condition: `refreshtoken='${refreshToken}'`
        })
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