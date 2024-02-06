import bcrypt from 'bcrypt';
import PGInterface from "../PGInterface";
import UserDto from '../dtos/user-dto';
import tokenService from '../services/token-service';
import ApiError from '../execptions/api-error';
import { v4 } from 'uuid';
import mailService from '../services/mail-service';
import { JwtPayload } from 'jsonwebtoken';

interface IAuthData {
    email: string,
    password: string
}

interface ILoginReturn {
    accessToken: string,
    refreshToken: string,
    user: UserDto
}

class WSUserController {
    async registration({ email, password }: IAuthData): Promise<ILoginReturn> {
        const candidate = await PGInterface.select({
            table: 'users',
            fields: ['*'],
            condition: `email='${email}'`
        })
        if (candidate.length > 0) {
            throw ApiError.BadRequest(`Пользователь с почтовым адресом ${email} уже существует`)
        }
        const hashPassword = await bcrypt.hash(password, 3);
        const activationLink = v4()
        const user = await PGInterface.insert({
            table: 'users',
            fields: ['email', 'password', 'activationlink'],
            values: [`'${email}'`, `'${hashPassword}'`, `'${activationLink}'`],
            returns: ['*']
        })
        await mailService.sendActivationMail(email, `${process.env.API_URL!}/api/v1/activate/${activationLink}`);
        const userDto = new UserDto(user[0]);
        const tokens = tokenService.generateTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return { ...tokens, user: userDto }
    }

    async login({ email, password }: IAuthData, socketid: string): Promise<ILoginReturn> {
        const user = await PGInterface.select({
            table: 'users',
            fields: ['*'],
            condition: `email='${email}'`
        })
        if (user.length === 0) {
            throw ApiError.BadRequest('Пользователь с таким email не найден')
        }
        const isPassEquals = await bcrypt.compare(password, user[0].password);
        if (!isPassEquals) {
            throw ApiError.BadRequest('Неверный пароль')
        }
        const userDto = new UserDto(user[0]);
        const tokens = tokenService.generateTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        await PGInterface.update({
            table: 'users',
            set: [`socketid='${socketid}'`],
            condition: `id=${userDto.id}`
        })
        return { ...tokens, user: userDto }
    }

    async logout(refreshToken: string, socketid: string) {
        const token = await tokenService.removeToken(refreshToken);
        await PGInterface.update({
            table: 'users',
            set: [`socketid=''`],
            condition: `socketid='${socketid}'`
        })
        return token
    }

    async activate() {
        //Пока что не знаю как сделать в монолите
    }

    async refresh(refreshToken: string, socketid: string) {
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
        await PGInterface.update({
            table: 'users',
            set: [`socketid='${socketid}'`],
            condition: `id=${userDto.id}`
        })
        return { ...tokens, user: userDto }
    }

    async getUsers(filter: string) {
        const filteryString: string = `%${filter}%`
        const users = await PGInterface.select({
            table: 'users',
            fields: ['id', 'email'],
            condition: `email LIKE '${filteryString}'`
        })
        return users
    }
}

export default new WSUserController();