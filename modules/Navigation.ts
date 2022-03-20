import { Choice, Prompt, PromptOptions, PromptTypes } from "../types/prompt";
import { Argument, CoreModules, IDictionary, IModule, isModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { ServicePortal } from "../API/ServicePortal";
import { Browser, Page } from "puppeteer";
import * as fs from 'fs'
import path from "path";
import SRGLogin from "./SRGLogin";
import { exit } from "process";
import { PromptFields } from "../const/PromptFIelds";

class Navigation implements IModule {
    name = "Navigation"
    description = "Permet de naviguer entre les modules";
    promptsTemplate = {
        SELECT_MODULE: {
            name: PromptFields.module,
            message: "Sélectionner un module",
            type: PromptTypes.autocomplete,
            suggest:ServicePortal.SuggestFullTextSpaceSeparatedExactMatch
        }
    };
    hidden: boolean = true
    fs = require('fs')
    moduleType?: CoreModules = CoreModules.Nav
    modules: IModule[] = []

    async run(browser: Browser): Promise<void> {
        let canceled = false
        let options: PromptOptions = { onCancel: (prompt, answer) => canceled = true }
        await this.LoadAllModules()
        const page = await this.StartSRGLogin(browser);
        await this.MakeChoicesFromModules()

        while (true) {
            const answer = await prompts(this.promptsTemplate.SELECT_MODULE, options);
            if (!canceled)
                await (answer[PromptFields.module] as IModule).run(browser, page)
            else{
                await browser.close()
                exit()
            }
        }
    }

    private async LoadAllModules() {
        if (this.modules.length > 0)
            throw new Error("Les modules ont déjà été chargés")
        let modulePath = './modules'
        if(!fs.existsSync(modulePath)) //L'application run à travers node.exe
            modulePath = './build/modules'
        let files = fs.readdirSync(modulePath)
        //files.map(console.log)
        files = files.filter(file => file.endsWith('.js') || file.endsWith('.ts')) //On récupère les fichiers .ts (ou .js pour le packaging)
        //console.log("Found " + files.length + " modules")
        for (let file of files) {
            try {
                let files = fs.readdirSync(modulePath)
                //console.log(`${modulePath}/${file}`)
                //console.log(require.resolve(`${modulePath}/${file}`))
                const tmp = require('./' + path.parse(file).name) //@TODO IMPORTANT NOK dans l'exe, les modules ne chargent pas
                if(isModule(tmp)){
                    this.modules.push(tmp)
                }else
                    console.log("Trouvé module non conforme : " + file)
            } catch {
                console.log("Failed to load module " + file)
            }
        }
    }

    private async GetModule<T>(modType: CoreModules): Promise<false | T> {
        const mod = this.modules.find(mod => mod?.moduleType === modType)
        if (!mod)
            return false
        return ((mod as any) as T)
    }

    private async StartSRGLogin(browser: Browser) {
        const SRGModule = await this.GetModule<typeof SRGLogin>(CoreModules.SRGLogin)
        if (!SRGModule)
            throw new Error("Pas réussi à récupérer le module SRGLogin")
        return await SRGModule.run(browser)
    }

    private async MakeChoicesFromModules(): Promise<void> {
        (this.promptsTemplate.SELECT_MODULE as any).choices = this.modules.filter(x => !x.hidden).map(
            (module: IModule): Choice => {
                return { title: module.name, description: module.description, value: module }
            }
        )
    }
}

export = new Navigation()