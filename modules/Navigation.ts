import { Prompt } from "../types/prompt";
import { Argument, CoreModules, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { ServicePortal } from "../helpers/ServicePortal";
import { Browser, Page } from "puppeteer";
import * as fs from 'fs'
import path from "path";

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
    promptsTemplate = {}; //Select prompt -> Autocomplete
    browser?: Browser | undefined;
    page?: Page | undefined;
    hidden: boolean = true
    fs = require('fs')
    moduleType?: CoreModules = CoreModules.Nav
    modules: IModule[] = []

    async run(browser: Browser): Promise<void> {
        this.browser = browser
        this.page = await browser.newPage() //@TODO regarder pour implémenter gestion de pages (pool de pages directement sur le serviceportal, assigner tâches par pages) Eg. Assign 4 PC -> 4 pages en parallèle
        this.LoadAllModules()
        this.StartSRGLogin()
        let SRGLogin: IModule = require('./modules/SRGLogin')
        await SRGLogin.run(browser, this.page);

        //@TODO Accéder au formulaire assign device, créer liste des inputs, soumettre SR
        throw new Error("Method not implemented.");
    }

    private async LoadAllModules() {
        if (this.modules.length > 0)
            throw new Error("Les modules ont déjà été chargés")

        const files = fs.readdirSync('.').filter(file => path.extname(file).toLocaleLowerCase() === '.ts') //On récupère les fichiers .ts
        for (let file of files) {
            try {
                this.modules.push(require(file) as IModule)
            } catch {
                console.log("Failed to load module")
            }
        }
    }
    //@TODO fonction get module<T>(module:CoreModules):<T>
}

export = new Navigation()