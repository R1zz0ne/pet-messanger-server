import { NextFunction, Request, Response } from "express";
import ApiError from "../execptions/api-error";
import tokenService from "../services/token-service";
import dialogService from "../services/dialog-service";
import messageService from "../services/message-service";

class DialogController {
    async setDialog(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return next(ApiError.UnauthorizedError())
            }
            const accessToken = authHeader.split(' ')[1];
            const userData = tokenService.checkAuthUser(accessToken);
            if (!userData) {
                return next(ApiError.UnauthorizedError())
            }
            const secondUser = req.body.userid;
            const dialog = await dialogService.setDialog([userData.id, secondUser]);
            return res.json(dialog);
        } catch (error: any) {
            next(error);
        }
    }

    async getDialogs(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return next(ApiError.UnauthorizedError())
            }
            const accessToken = authHeader.split(' ')[1];
            const userData = tokenService.checkAuthUser(accessToken);
            if (!userData) {
                return next(ApiError.UnauthorizedError())
            }
            const dialogs = await dialogService.getDialogs(userData.id);
            return res.json(dialogs)
        } catch (error: any) {
            next(error)
        }
    }

    async getMessages(req: Request, res: Response, next: NextFunction) {
        try {
            const idDialog: string = req.params.id;
            if (!idDialog || !idDialog.trim()) {
                return next(ApiError.BadRequest('idDialog не указан'))
            }
            const messages = await messageService.getMessages(idDialog);
            return res.json(messages);
        } catch (error: any) {
            next(error);
        }
    }

    async setMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const idDialog = req.params.id;
            const message = req.body.message;
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return next(ApiError.UnauthorizedError())
            }
            const accessToken = authHeader.split(' ')[1];
            const userData = tokenService.checkAuthUser(accessToken);
            if (!userData) {
                return next(ApiError.UnauthorizedError())
            }
            await messageService.setMessage(idDialog, userData.id, message);
            return res.json({});
        } catch (error: any) {
            next(error);
        }
    }
}

export default new DialogController();