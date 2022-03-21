import { Browser, ElementHandle, Page } from "puppeteer";
import { Prompt, PromptOptions, PromptTypes } from "../types/prompt";
import { Argument, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { INPUT_TYPES, Selectors, ServicePortal } from "../API/ServicePortal";
import { HomeTileIdentifiers } from "../const/HomeTileIdentifiers";
import { PromptFields } from "../const/PromptFIelds";
import { Misc } from "../API/misc";
import { CUSTOM_IDs } from "../const/CustomIds";

class Stock implements IModule {
    name = "Stock"
    description = "Correspond à la tuile \"Stock device\"";
    promptsTemplate = {
        COMPUTER_LIST: {
            name: PromptFields.MACHINE_NUMBER,
            message: "Numéros de machine, séparé par un espace",
            type: PromptTypes.list,
            separator: ' ',
        }
    }; //Machine number -> type:list
    hidden: boolean = false

    async run(browser: Browser, page?: Page): Promise<void> {
        if (!page)
        page = await ServicePortal.Open(browser)
        else
        await ServicePortal.Open(page)
        
        await ServicePortal.OpenHomeTile(page, HomeTileIdentifiers.Stock)
        let computers: string[] | false = await this.GetComputerNames()
        
        if (!computers)
            return

        const stepNum = 0 //La step est inclue dans le sélecteur (retourné comme réponse de certains prompts), ELLE NE DOIT SURTOUT PAS CHANGER
        let computerInputResult = (await ServicePortal.FillForm(page, stepNum, undefined, true, computers.shift()))
        if(!computerInputResult) //Cancelled
            return

        const restOfForm = (await ServicePortal.FillForm(page, stepNum, computerInputResult[0].index))
        if(!restOfForm) //Cancelled
            return 
        const constantValues = restOfForm.map(x => x.value)
        const SR = await ServicePortal.GoToFormNextStep(page, stepNum)
        console.log("Créé ServiceRequest " + SR)
        const shouldConfirmSROld = ServicePortal.Settings.ASK_CONFIRMATION_BEFORE_SUBMITTING_SR
        ServicePortal.Settings.ASK_CONFIRMATION_BEFORE_SUBMITTING_SR = false //On évite de prompter l'utilisateur à chaque nouvelle SR
        for(let computer of computers) {
            await ServicePortal.OpenHomeTile(page, HomeTileIdentifiers.Stock)
            await ServicePortal.FillForm(page, stepNum, 0, false, ([computer] as any[]).concat(constantValues))
            const SR = await ServicePortal.GoToFormNextStep(page, stepNum)
            console.log("Créé ServiceRequest " + SR)
        }
        ServicePortal.Settings.ASK_CONFIRMATION_BEFORE_SUBMITTING_SR = shouldConfirmSROld //On remet le settings comme il était
    }

    async GetComputerNames(): Promise<false | string[]> {
        let canceled = false
        const options: PromptOptions = { onCancel: () => canceled = true }
        const values = (await prompts(this.promptsTemplate.COMPUTER_LIST))[PromptFields.MACHINE_NUMBER]
        if (!values || canceled)
            return false
        return values
    }

}


export = new Stock()