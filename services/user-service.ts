import bcrypt from "bcrypt";
import mailService from "./mail-service";
import tokenService from "./token-service";
import UserDto from "../dtos/user-dto";
import { v4 } from "uuid";
import ApiError from "../execptions/api-error";
import { JwtPayload } from "jsonwebtoken";
import PGInterface from "../PGInterface";

class UserService {
    async registration(email: string, password: string) { //Проверено
        const candidate = await PGInterface.select({
            table: 'users',
            fields: ['*'],
            condition: `email='${email}'`
        })
        if (candidate.length > 0) {
            throw ApiError.BadRequest(`Пользователь с почтовым адресом ${email} уже существует`)
        }
        const hashPassword = await bcrypt.hash(password, 3);
        const activationLink = v4();
        const user = await PGInterface.insert({
            table: 'users',
            fields: ['email', 'password', 'activationlink'],
            values: [`'${email}'`, `'${hashPassword}'`, `'${activationLink}'`],
            returns: ['*']
        })
        await mailService.sendActivationMail(email, `${process.env.API_URL!}/api/v1/activate/${activationLink}`);
        console.log(user);
        
        const userDto = new UserDto(user[0]);
        const tokens = tokenService.generateTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return { ...tokens, user: userDto }
    }

    async activate(activationlink: string) { //Проверено
        const user = await PGInterface.select({
            table: 'users',
            fields: ['*'],
            condition: `activationlink='${activationlink}'`
        })
        if (user.length === 0) {
            throw ApiError.BadRequest('Некорректная ссылка активации')
        }
        await PGInterface.update({
            table: 'users',
            set: ['isactivated=true'],
            condition: `id=${user[0].id}`
        })
    }

    async login(email: string, password: string) { //Проверено
        const user = await PGInterface.select({
            table: 'users',
            fields: ['*'],
            condition: `email='${email}'`
        })
        if (user.length === 0) {
            throw ApiError.BadRequest('ПОльзователь с таким email не найден')
        }
        const isPassEquals = await bcrypt.compare(password, user[0].password);
        if (!isPassEquals) {
            throw ApiError.BadRequest('Неверный пароль')
        }
        const userDto = new UserDto(user[0]);
        const tokens = tokenService.generateTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return { ...tokens, user: userDto }
    }

    async logout(refreshToken: string) { //Проверено
        const token = await tokenService.removeToken(refreshToken);
        return token;
    }

    async refresh(refreshToken: string) { //Проверено
        if (!refreshToken) {
            throw ApiError.UnauthorizedError();
        }
        const userData = tokenService.validateRefreshToken(refreshToken) as JwtPayload;
        const tokenFromDb = await tokenService.findToken(refreshToken);
        if (!userData || !tokenFromDb) {
            throw ApiError.UnauthorizedError();
        }
        const user = await PGInterface.select({
            table: 'users',
            fields: ['*'],
            condition: `id=${userData.id}`
        })
        const userDto = new UserDto(user[0]);
        const tokens = tokenService.generateTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return { ...tokens, user: userDto }
    }

    async getAllUsers() { //TODO: этот метод вроде не используется, убрать, если не потребуется
        const users = await PGInterface.select({
            table: 'users',
            fields: ['*']
        })
        return users;
    }

    async getUsers(filter: string) { //Проверено
        const filteryString: string = `%${filter}%`
        const users = await PGInterface.select({
            table: 'users',
            fields: ['id', 'email'],
            condition: `email LIKE '${filteryString}'`
        })
        return users
    }
}

export default new UserService();