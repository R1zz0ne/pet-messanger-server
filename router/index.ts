import express, { Router } from "express";
import userController from "../controllers/user-controller";
import { body } from "express-validator";
import authMiddleware from "../middlewares/auth-middleware";
import dialogController from "../controllers/dialog-controller";
const router: Router = express.Router();

router.post('/registration',
    body('email').isEmail(),
    body('password').isLength({ min: 8, max: 32 }),
    userController.registration);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.get('/activate/:link', userController.activate);
router.get('/refresh', userController.refresh);
router.get('/allusers', authMiddleware, userController.getAllUsers); //не используется
router.get('/users', authMiddleware, userController.getUsers);
router.get('/dialogs', authMiddleware, dialogController.getDialogs);
router.post('/dialogs', authMiddleware, dialogController.setDialog);
router.get('/dialogs/:id/messages', authMiddleware, dialogController.getMessages);
router.post('/dialogs/:id/messages', authMiddleware, dialogController.setMessage);

export default router;