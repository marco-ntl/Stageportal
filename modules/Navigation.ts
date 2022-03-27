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
    moduleType = CoreModules.Nav
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

    /**
     * Charge tous les modules dans ./modules dans this.modules
     *
     * @private
     * @memberof Navigation
     */
    private async LoadAllModules() {
        if (this.modules.length > 0)
            throw new Error("Les modules ont déjà été chargés")
        let modulePath = './modules'
        if(!fs.existsSync(modulePath)) //L'application run à travers node.exe
            modulePath = './build/modules'
        let files = fs.readdirSync(modulePath)
        files = files.filter(file => file.endsWith('.js') || file.endsWith('.ts')) //On récupère les fichiers .ts (ou .js pour le packaging)
        for (let file of files) {
            try {
                const tmp = require('./' + path.parse(file).name)
                if(isModule(tmp)){
                    this.modules.push(tmp)
                }else
                    console.log("Trouvé module non conforme : " + file)
            } catch {
                console.log("Failed to load module " + file)
            }
        }
    }

    /**
     * Retourne le module correspondant, sous forme d'IModule
     *
     * @private
     * @template T Le type du module
     * @param {CoreModules} modType Le module désiré
     * @return {*}  {(Promise<false | T>)} Le module as T
     * @memberof Navigation
     */
    private async GetModule<T>(modType: CoreModules): Promise<false | T> {
        const mod = this.modules.find(mod => mod?.moduleType === modType)
        if (!mod)
            return false
        return ((mod as any) as T)
    }

    /**
     * Lance le module de login SRG
     *
     * @private
     * @param {Browser} browser Le browser sur lequel lancer le module
     * @return {*} 
     * @memberof Navigation
     */
    private async StartSRGLogin(browser: Browser) {
        const SRGModule = await this.GetModule<typeof SRGLogin>(CoreModules.SRGLogin)
        if (!SRGModule)
            throw new Error("Pas réussi à récupérer le module SRGLogin")
        return await SRGModule.run(browser)
    }

    /**
     * Créer une liste de choix à partir de this.modules
     *
     * @private
     * @return {*}  {Promise<void>}
     * @memberof Navigation
     */
    private async MakeChoicesFromModules(): Promise<void> {
        (this.promptsTemplate.SELECT_MODULE as any).choices = this.modules.filter(x => !x.hidden).map(
            (module: IModule): Choice => {
                return { title: module.name, description: module.description, value: module }
            }
        )
    }
}

export = new Navigation()