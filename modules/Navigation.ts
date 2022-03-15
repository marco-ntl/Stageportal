import { Choice, Prompt, PromptTypes } from "../types/prompt";
import { Argument, CoreModules, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { ServicePortal } from "../helpers/ServicePortal";
import { Browser, Page } from "puppeteer";
import * as fs from 'fs'
import path from "path";
import SRGLogin from "./SRGLogin";

/*const ARGUMENT_PC:Argument = {
    name: 'PC',
    description: 'Le(s) numéro(s) de PC (séparés par un espace)',
    required: true,
    example: 'RTSC012345 001234 013543',
    values:undefined
}
const ARGUMENT_USER:Argument = {
    name: 'username',
    description: "L'username du propriétaire",
    required: true,
    example: 'natalema',
    values:undefined
}*/
class Navigation implements IModule {
    name = "Navigation"
    description = "Permet de naviguer entre les modules";
    promptsTemplate = {
        SELECT_MODULE:{
        name:promptFields.module,
        message:"Sélectionner un module",
        type:PromptTypes.autocomplete,
        }
    }; //Select prompt -> Autocomplete
    hidden: boolean = true
    fs = require('fs')
    moduleType?: CoreModules = CoreModules.Nav
    modules: IModule[] = []
    
    async run(browser: Browser): Promise<void> {
        //await browser.newPage() //@TODO regarder pour implémenter gestion de pages (pool de pages directement sur le serviceportal, assigner tâches par pages) Eg. Assign 4 PC -> 4 pages en parallèle
        await this.LoadAllModules()
        const page = await this.StartSRGLogin(browser);
        await this.MakeChoicesFromModules()
        const answer = await prompts(this.promptsTemplate.SELECT_MODULE);
        await (answer[promptFields.module] as IModule).run(browser, page)
        //@TODO Accéder au formulaire assign device, créer liste des inputs, soumettre SR
    }

    private async LoadAllModules() {
        if (this.modules.length > 0)
            throw new Error("Les modules ont déjà été chargés")

        const files = fs.readdirSync('./modules').filter(file => path.extname(file).toLocaleLowerCase() === '.ts') //On récupère les fichiers .ts
        for (let file of files) {
            try {
                const tmp = require('./' + path.parse(file).name) //@TODO check conformité avec IModule
                this.modules.push(tmp)
            } catch {
                console.log("Failed to load module " + file)
            }
        }
    }

    private async GetModule<T>(modType:CoreModules):Promise<false | T>{
        const mod = this.modules.find(mod => mod?.moduleType === modType)
        if(!mod)
            return false
        return ((mod as any) as T)
    }

    private async StartSRGLogin(browser:Browser){
        const SRGModule = await this.GetModule<typeof SRGLogin>(CoreModules.SRGLogin)
        if(!SRGModule)
            throw new Error("Pas réussi à récupérer le module SRGLogin")
        return await SRGModule.run(browser)
    }

    private async MakeChoicesFromModules():Promise<void>{
        (this.promptsTemplate.SELECT_MODULE as any).choices = this.modules.filter(x => !x.hidden).map(
            (module:IModule):Choice => {
                return {title:module.name, description:module.description, value:module}
            }
        )
    }
}
enum promptFields{
    module = 'module'
}
export = new Navigation()