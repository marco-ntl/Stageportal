import { Browser, ElementHandle, Page } from "puppeteer";
import { prompts, submitAndWaitForLoad } from "..";
import { Prompt, PromptTypes } from "../types/prompt";
import { IModule } from "../types/IModule";


class SRGLogin implements IModule {
    name = "Login SRG";
    description = "Ce module permet de se connecter au SSO SRG";
    promptsTemplate = {
        AUTH_SRG: [
            { type: PromptTypes.text, name: PromptFields.username, message: 'Username' },
            { type: PromptTypes.password, name: PromptFields.password, message: 'Mot de passe' }
        ],
        AUTH_SRG_OTP: { type: PromptTypes.text, name: PromptFields.otp, message: 'Entrez le code SMS', validate: this.validateOTP }
    }
    browser?: Browser;
    page?: Page;
    hidden = true;
    
    async run(browser:Browser, page:Page): Promise<void> {
        this.browser = browser;
        this.page = page;

        await this.page.goto('https://serviceportal.srgssr.ch');
        if (this.isSSRLogin()) {
            await this.SSRLogin()
        }
    }

    validateOTP(value: string): boolean | string {
        return /^\D+$/.test(value) ? 'Le code ne peut contenir que des chiffres' :
            value.length < 6 ? 'Code trop court' :
                value.length > 6 ? 'Code trop long' :
                    true
    }


    isSSRLogin(): boolean {
        return (this.page as Page).url().includes(URLs.SRG_AUTH);
    }

    async SSRLogin() {
        const page = (this.page as Page);
        await page.waitForSelector(SELECTORS.AUTH_SUBMIT);
      
        const inputUsername: ElementHandle | null = await page.$(SELECTORS.AUTH_USERNAME)
        const inputPWD: ElementHandle | null = await page.$(SELECTORS.AUTH_PWD)
        let inputSubmit: ElementHandle | null = await page.$(SELECTORS.AUTH_SUBMIT)
      
        if (!inputUsername || !inputPWD || !inputSubmit)
          throw new Error("Pas trouvé le champ username, mot de passe, ou le bouton envoyer")
      
        //Demande les informations de login à l'utilisateur
        const loginInfo: {[key in PromptFields]:string} = await prompts(this.promptsTemplate.AUTH_SRG)
        await inputUsername.type(loginInfo[PromptFields.username]);
        await inputPWD.type(loginInfo[PromptFields.password]);
        await submitAndWaitForLoad(page, inputSubmit);
      
        //Demande le One Time Password (Code SMS) à l'utilisateur
        const inputOTP: ElementHandle | null = await page.$(SELECTORS.AUTH_OTP);
        inputSubmit = await page.$(SELECTORS.AUTH_SUBMIT)
      
        if (!inputOTP || !inputSubmit)
          throw new Error("Pas trouvé le champ Code SMS, ou le bouton envoyer")
      
          
        const OTP = await prompts(this.promptsTemplate.AUTH_SRG_OTP)
        await inputOTP.type(OTP[PromptFields.otp]);
        await submitAndWaitForLoad(page, inputSubmit);
      }

}

enum PromptFields {
    username = 'username',
    password = 'pwd',
    otp = 'otp'
}

enum URLs {
    SRG_AUTH = "auth.app.srgssr.ch"
}

enum SELECTORS {
    AUTH_USERNAME = 'input[name="username"]',
    AUTH_PWD = 'input[type="password"]',
    AUTH_SUBMIT = 'input[type="submit"]',
    AUTH_OTP = 'input[name="ecallpassword"]',
}

export = new SRGLogin()