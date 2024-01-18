import bcrypt from "bcrypt";
import mailService from "./mail-service";
import tokenService from "./token-service";
import UserDto from "../dtos/user-dto";
import { v4 } from "uuid";
import ApiError from "../execptions/api-error";
import { JwtPayload } from "jsonwebtoken";
import db from "../db";

class UserService {
    async registration(email: string, password: string) { //переписано, не проверено
        const candidate = await db.query('SELECT * FROM users WHERE email=$1', [email]);
        if (candidate.rowCount && candidate.rowCount > 0) {
            throw ApiError.BadRequest(`Пользователь с почтовым адресом ${email} уже существует`)
        }
        const hashPassword = await bcrypt.hash(password, 3);
        const activationLink = v4();

        const user = await db.query('INSERT INTO users (email, password, activationlink) VALUES ($1, $2, $3) RETURNING *', [email, hashPassword, activationLink])
        await mailService.sendActivationMail(email, `${process.env.API_URL!}/api/v1/activate/${activationLink}`);

        const userDto = new UserDto(user.rows[0]);
        const tokens = tokenService.generateTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return { ...tokens, user: userDto }
    }

    async activate(activationlink: string) { //переписано, не протестирована
        const user = await db.query('SELECT * FROM users WHERE activationlink=$1', [activationlink])
        if (user.rowCount === 0) {
            throw ApiError.BadRequest('Некорректная ссылка активации')
        }
        await db.query('UPDATE users set isactivated=true WHERE id=$1', [user.rows[0].id])
    }

    async login(email: string, password: string) { //переписано, не протестировано
        const user = await db.query('SELECT * FROM users WHERE email=$1', [email]);
        if (user.rowCount === 0) {
            throw ApiError.BadRequest('ПОльзователь с таким email не найден')
        }
        const isPassEquals = await bcrypt.compare(password, user.rows[0].password);
        if (!isPassEquals) {
            throw ApiError.BadRequest('Неверный пароль')
        }
        const userDto = new UserDto(user.rows[0]);
        const tokens = tokenService.generateTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return { ...tokens, user: userDto }
    }

    async logout(refreshToken: string) {
        const token = await tokenService.removeToken(refreshToken);
        return token;
    }

    async refresh(refreshToken: string) {
        if (!refreshToken) {
            throw ApiError.UnauthorizedError();
        }
        const userData = tokenService.validateRefreshToken(refreshToken) as JwtPayload;
        const tokenFromDb = await tokenService.findToken(refreshToken);
        if (!userData || !tokenFromDb) {
            throw ApiError.UnauthorizedError();
        }
        const user = await db.query('SELECT * FROM users WHERE id=$1', [userData.id])
        const userDto = new UserDto(user.rows[0]);
        const tokens = tokenService.generateTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return { ...tokens, user: userDto }
    }

    async getAllUsers() {
        const users = await db.query('SELECT * FROM users')
        return users.rows;
    }

    async getUsers(query: string) {
        const queryString: string = `%${query}%`
        const users = await db.query('SELECT id,email FROM users WHERE email LIKE $1', [queryString]);
        return users.rows
    }
}

export default new UserService();