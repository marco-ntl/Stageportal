import { Browser, ElementHandle, Page } from "puppeteer";
import { Choice, Prompt, PromptTypes } from "../types/prompt";
import { Argument, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { LAYOUT_TYPES, ServicePortal, URLs, Selectors, INPUT_TYPES } from "../helpers/ServicePortal";
import { type } from "os";
import { Misc } from "../helpers/misc";

class Manual implements IModule {
    name = "Navigation textuelle"
    description = "Permet de naviguer le ServicePortal de façon textuelle";
    promptsTemplate = {
        SELECT_TILE: {
            type: PromptTypes.autocomplete,
            name: PromptFields.TILES,
            message: "Sélectionner la tuile",
        }
    };

    browser?: Browser;
    page?: Page;
    async run(browser: Browser, page?: Page): Promise<void> {
        if (!page)
            page = await ServicePortal.Open(browser) as Page
        else
            await ServicePortal.Open(page)
        do {
            let layoutType = await ServicePortal.GetLayoutType(page)
            switch (layoutType) {
                case LAYOUT_TYPES.Tiles:
                    let tiles = await ServicePortal.GetAllTiles(page);
                    (this.promptsTemplate.SELECT_TILE as any).choices = await ServicePortal.GetChoicesFromTiles(tiles)
                    let userChoice: { [index:string]:ElementHandle<Element> } = await prompts(this.promptsTemplate.SELECT_TILE)
                    //await ServicePortal.UnfoldAllTiles(page) //La page ne détecte pas toujours un clic sur un élément sensé être caché
                    //await Misc.ClickAndWaitForSelector(page, '#' + userChoice[PromptFields.TILES], Selectors.IS_LOADING, true) //@TODO N'arrive pas à ouvrir le choix de l'utilisateur
                    await Misc.ClickAndWaitForNetworkIdle(page, '#' + userChoice[PromptFields.TILES])
                    break;

                case LAYOUT_TYPES.Form:
                    await ServicePortal.FillForm(page)
                    const result = await ServicePortal.GoToFormNextStep(page)
                    if(typeof result === "string")
                        console.log("Créé ServiceRequest " + result)
                    break;
                default:
                    break;
            }
        } while (!page.url().includes(URLs.HOME_PAGE))
    }
}


enum PromptFields {
    TILES = "tiles"
}

/*interface INPUT_SEARCH {
    itx-searchbox:string;
}*/

export = new Manual()