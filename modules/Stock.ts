import { Browser, ElementHandle, Page } from "puppeteer";
import { Prompt } from "../types/prompt";
import { Argument, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { ServicePortal } from "../helpers/ServicePortal";
import { HomeTileIdentifiers } from "../const/HomeTileIdentifiers";

class Stock implements IModule{
    name = "EN COURS Stock"
    description = "Correspond à la tuile \"Stock device\"";
    promptsTemplate = {}; //Machine number -> type:list
    hidden:boolean = false
    
    async run(browser: Browser, page?: Page): Promise<void> {
        if(!page)
            page = await ServicePortal.Open(browser)
        else
            await ServicePortal.Open(page)
        await ServicePortal.OpenHomeTile(page, HomeTileIdentifiers.Stock)
        //@TODO IMPORTANT NEXT Prompt pour numéros de machines, ring, businessType, region;for num {FillForm(values)}
        //Demander numéros de machines à l'utilisateur
        //for num -> fillSingleInput(index = 0, value = num)
        //fillForm(startIndex = 1)
        throw new Error("Method not implemented.");
    }
}


export = new Stock()