class Validator {
    errors: string[]
    emailTester = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
    constructor() {
        this.errors = []
    }
    isEmail(email: string, key: string) {
        if (!email) {
            this.errors.push('Передано пустое значение')
            return
        }
        if (email.length > 254) {
            this.errors.push('Передано значение не допустимой длины')
            return
        }
        const valid = this.emailTester.test(email);
        if (!valid) {
            this.errors.push('Передано значение, не являющееся почтой')
            return
        }
    }
    isLength(data: string, key: string, { min, max }: { min: number, max: number }) {
        if (!data) {
            this.errors.push(`Значение не может быть пустым`)
            return
        }
        const ln = data.length
        if (min <= 0 && max <= 0) {
            return
        }
        if (min > 0 && max > 0) {
            if (ln < min || ln > max) {
                this.errors.push(`Кол-во символов должно быть от ${min} до ${max}`)
                return
            }
        }
        if (min > 0 && max <= 0) {
            if (ln < min) {
                this.errors.push(`Кол-во символов должно быть от ${min}`)
                return
            }
        }
        if (min <= 0 && max > 0) {
            if (ln > max) {
                this.errors.push(`Кол-во символов должно быть до ${max}`)
                return
            }
        }
    }
}

export default new Validator();