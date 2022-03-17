import { Browser, ElementHandle, Page } from "puppeteer";
import { Prompt } from "../types/prompt";
import { Argument, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { ServicePortal } from "../helpers/ServicePortal";

class Assign implements IModule{
    name = "EN COURS Stock"
    description = "Correspond à la tuile \"Stock device\"";
    promptsTemplate = {}; //Machine number -> type:list
    hidden:boolean = false
    
    async run(browser: Browser, page?: Page): Promise<void> {
        if(!page)
            page = await ServicePortal.Open(browser)
        else
            await ServicePortal.Open(page)

        //@TODO Si GUID de la tile pas dans la db -> Demander à l'utilisateur de séléctionner la tile
        //@IDEA Fonction "SelectTile(identifier:TILES)" dans ServicePortal qui s'occupe du TODO ci-dessus

        //@TODO Ouvrir tuile "Assign"
        //Demander numéros de machines à l'utilisateur
        //for num -> fillSingleInput(index = 0, value = num)
        //fillForm(startIndex = 1)
        throw new Error("Method not implemented.");
    }
}


export = new Assign()