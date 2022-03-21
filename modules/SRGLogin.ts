import { Browser, ElementHandle, Page } from "puppeteer";
import { prompts, } from "..";
import { Prompt, PromptTypes } from "../types/prompt";
import { CoreModules, IModule } from "../types/IModule";
import { Misc } from '../API/misc'
import { ServicePortal } from "../API/ServicePortal";
import { PromptFields } from "../const/PromptFIelds";
import { URLs } from "../const/URLs";

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
    hidden = true; //Est-ce que le module doit être affiché à l'utilisateur
    moduleType = CoreModules.SRGLogin

    async run(browser: Browser, page?: Page): Promise<Page> {
        this.browser = browser
        if (page)
            this.page = page;
        else
            this.page = await this.browser.newPage()

        await this.page.goto(URLs.SERVICE_PORTAL)
        if (this.isSSRLogin()) {
            await this.SSRLogin()
        }
        return this.page
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

    async SSRLogin(): Promise<void> {
        const page = (this.page as Page);
        await page.waitForSelector(Selectors.AUTH_SUBMIT);

        if (!await Misc.ElementExists(page, Selectors.AUTH_USERNAME) ||
            !await Misc.ElementExists(page, Selectors.AUTH_PWD ||
                !await Misc.ElementExists(page, Selectors.AUTH_SUBMIT)))
            throw new Error("Pas trouvé le champ username, mot de passe, ou le bouton envoyer")

        //Demande les informations de login à l'utilisateur
        const loginInfo: { [key in PromptFields]: string } = await prompts(this.promptsTemplate.AUTH_SRG)
        await Misc.FocusElemAndType(page, Selectors.AUTH_USERNAME, loginInfo[PromptFields.username])
        await Misc.FocusElemAndType(page, Selectors.AUTH_PWD, loginInfo[PromptFields.password])
        await Misc.ClickAndWaitForLoad(page, Selectors.AUTH_SUBMIT);

        if (!await Misc.ElementExists(page, Selectors.AUTH_OTP) ||
            !await Misc.ElementExists(page, Selectors.AUTH_SUBMIT)) {
                console.log("Nom d'utilisateur ou mot de passe incorrect")
                await this.run(this.browser as Browser, this.page) //Il faut recharger la page de SSO pour réessayer de se connecter
                return
        }


        //Demande le One Time Password (Code SMS) à l'utilisateur
        const OTP = await prompts(this.promptsTemplate.AUTH_SRG_OTP)
        await Misc.FocusElemAndType(page, Selectors.AUTH_OTP, OTP[PromptFields.otp])
        await Misc.ClickAndWaitForLoad(page, Selectors.AUTH_SUBMIT);
        if(!ServicePortal.IsHomepage(page)){
            console.log('Code SMS incorrect')
            await this.run(this.browser as Browser, page)
        }
    }

}



enum Selectors {
    AUTH_USERNAME = 'input[name="username"]',
    AUTH_PWD = 'input[type="password"]',
    AUTH_SUBMIT = 'input[type="submit"]',
    AUTH_OTP = 'input[name="ecallpassword"]',
}

export = new SRGLogin()