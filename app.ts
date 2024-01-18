import cookieParser from 'cookie-parser';
import 'dotenv/config'
import express, { Express } from 'express';
import cors from 'cors';
import router from './router/index';
import errorMiddleware from './middlewares/error-middleware';

const PORT: string = process.env.PORT || '5001';
const app: Express = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
}));
app.use('/api/v1/', router);
app.use(errorMiddleware);

const start = async (): Promise<void> => {
    try {
        app.listen(PORT, () => {
            console.log(`Сервер запущен на ${PORT} порту`)
        })
    } catch (error: any) {
        console.log(error);
    }
}

start();