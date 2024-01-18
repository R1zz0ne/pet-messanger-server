import { NextFunction, Request, Response } from "express";
import userService from "../services/user-service";
import { validationResult } from "express-validator";
import ApiError from "../execptions/api-error";

class UserController {
    async registration(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(ApiError.BadRequest('Ошибка валидации', errors.array()))
            }
            const userData = userService.registration(email, password);
            res.cookie('refreshToken', (await userData).refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true })
            return res.json(await userData);
        } catch (error: any) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const userData = await userService.login(email, password);
            res.cookie('refreshToken', (await userData).refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true })
            return res.json(await userData);
        } catch (error: any) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.cookies;
            await userService.logout(refreshToken);
            res.clearCookie('refreshToken');
            return res.json();
        } catch (error: any) {
            next(error);
        }
    }

    async activate(req: Request, res: Response, next: NextFunction) {
        try {
            const activationLink: string = req.params.link;
            await userService.activate(activationLink);
            return res.redirect(process.env.CLIENT_URL!);
        } catch (error: any) {
            next(error);
        }
    }

    async refresh(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.cookies;
            const userData = await userService.refresh(refreshToken);
            res.cookie('refreshToken', (await userData).refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true })
            return res.json(await userData);
        } catch (error: any) {
            next(error);
        }
    }

    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await userService.getAllUsers();
            return res.json(users);
        } catch (error: any) {
            next(error);
        }
    }
    async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const query = req.query.query as string;
            const users = await userService.getUsers(query);
            return res.json(users);
        } catch (error: any) {
            next(error);
        }
    }
}

export default new UserController();