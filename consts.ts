import { Question, PromptCallback, PromptFields, PromptTypes } from './questions'

export enum URLs {
    SRG_AUTH = "auth.app.srgssr.ch"
}

export enum SELECTORS {
    AUTH_USERNAME = 'input[name="username"]',
    AUTH_PWD = 'input[type="password"]',
    AUTH_SUBMIT = 'input[type="submit"]',
    AUTH_OTP = 'input[name="ecallpassword"]',
}

export enum MISC {
    VERSION = '0.0.1'
}

export class PROMPTS {
    static AUTH_SRG:Question[] = [
        {
            type: PromptTypes.text,
            name: PromptFields.username,
            message: 'Username'
        },
        {
            type: PromptTypes.password,
            name: PromptFields.password,
            message: 'Mot de passe'
        }
    ];

    static AUTH_SRG_OTP:Question = {
        type:PromptTypes.text,
        name: PromptFields.otp,
        message: 'Entrez le code SMS',
        validate: value => /^\D+$/.test(value) ? 'Le code ne peut contenir que des chiffres' : value.length < 6 ? 'Code trop court' : value.length > 6 ? 'Code trop long' : true
    };
}
