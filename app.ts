import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import WSUserController from './WS/WSUserController'
import ApiError from './execptions/api-error'
import WSDialogController from './WS/WSDialogController'
import tokenService from './services/token-service'
import PGInterface from './PGInterface'
const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

const PORT: string = process.env.PORT || '5001';

io.on('connection', (socket) => {
    console.log(`Пользователь ${socket.id} подключен`);
    socket.use(async ([event, data], next) => {
        try {
            if (event === 'getDialogs' || event === 'setDialog'
                || event === 'users' || event === 'getMessages' || event === 'setMessage') {
                const accessToken = socket.handshake.headers.accesstoken as string;
                if (!accessToken) {
                    throw ApiError.UnauthorizedError()
                }
                const userData = tokenService.validateAccessToken(accessToken);
                if (!userData) {
                    throw ApiError.UnauthorizedError()
                }
            }
            switch (event) {
                case 'registration':
                    //TODO: нужно будет дописать валидацию, либо реализовать ее на клиенте
                    const userData = WSUserController.registration(data);
                    socket.emit('registration', { ...userData })
                    break
                case 'login':
                    const authData = await WSUserController.login(data, socket.id);
                    socket.emit('login', { ...authData })
                    break
                case 'logout':
                    const refreshToken = socket.handshake.headers.refreshToken as string;
                    await WSUserController.logout(refreshToken, socket.id);
                    socket.emit('logout', {}) //TODO:Определиться, что передавать
                    break
                case 'refresh':
                    const updateToken = await WSUserController.refresh(data.refreshtoken, socket.id);
                    socket.emit('login', { ...updateToken })
                    break
                case 'getUsers':
                    const filter = data.filter;
                    const users = await WSUserController.getUsers(filter)
                    socket.emit('getUsers', { users: users })
                    break
                case 'getDialogs': //Требуется проверка авторизации
                    const accessTokenGD = socket.handshake.headers.accesstoken as string;
                    if (!accessTokenGD) {
                        throw ApiError.UnauthorizedError()
                    }
                    const dialogs = await WSDialogController.getDialogs(accessTokenGD);
                    socket.emit('getDialogs', { dialogs: dialogs })
                    break
                case 'setDialog': //Требуется проверка авторизации
                    const accessTokenSD = socket.handshake.headers.accesstoken as string;
                    if (!accessTokenSD) {
                        throw ApiError.UnauthorizedError()
                    }
                    const dialog = await WSDialogController.setDialog(accessTokenSD, data.userid)
                    socket.emit('setDialog', dialog)
                    const mess = await WSDialogController.setMessage(accessTokenSD,
                        { id: dialog.id, message: data.message })
                    socket.emit('setMessage', { message: mess })
                    break
                case 'getMessages': //Требуется проверка авторизации
                    const messages = await WSDialogController.getMessages(data);
                    socket.emit('getMessages', { messages: messages })
                    break
                case 'setMessage': //Требуется проверка авторизации
                    const accessTokenSM = socket.handshake.headers.accesstoken as string;
                    if (!accessTokenSM) {
                        throw ApiError.UnauthorizedError()
                    }
                    const message = await WSDialogController.setMessage(accessTokenSM, data);
                    const arraySockets: { socketid: string }[] = await PGInterface.select({
                        fields: ['socketid'],
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
                        condition: `dialog.id = ${message.dialogid}`
                    })
                    const array: string[] = arraySockets.map((el) => el.socketid)
                    io.to(array).emit('setMessage', { message })
                    break
                default:
                    throw new Error('Попытка вызвать не существующее событие!')
            }
            next();
        } catch (error: any) {
            console.log(error);
            if (error instanceof ApiError) {
                socket.emit('error', { message: error.message, errors: error.errors })
            } else {
                socket.emit('error', { message: 'Непредвиденная ошибка', errors: [] })
            }
        }
    });

    socket.on('disconnect', async () => {
        console.log(`Пользователь ${socket.id} отключен`);
        await PGInterface.update({
            table: 'users',
            set: [`socketid=''`],
            condition: `socketid='${socket.id}'`
        })
    });
})

httpServer.listen(PORT, () => {
    console.log(`Сервер запущен на ${PORT} порту`);
})