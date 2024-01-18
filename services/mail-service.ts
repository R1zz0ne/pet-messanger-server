import nodemailer from "nodemailer";
import 'dotenv/config'

class MailService {
    transporter: any;
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST!,
            port: Number(process.env.SMTP_PORT!),
            secure: false,
            auth: {
                user: process.env.SMTP_USER!,
                pass: process.env.SMTP_PASSWORD!
            }
        })
    }
    async sendActivationMail(to: string, link: string) {
        await this.transporter.sendMail({
            from: process.env.SMTP_USER!,
            to,
            subject: 'Активация аккаунта на r1messanger',
            text: '',
            html: `
                <div>
                    <h1>Для активации перейдите по ссылке</h1>
                    <a href="${link}">${link}</a>
                </div>
            `
        })
    }
}

export default new MailService();