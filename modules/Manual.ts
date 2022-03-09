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
            suggest:ServicePortal.SuggestSpaceSeparatedExactMatch //Meilleur recherche via le paramètre suggest
        }
    };

    browser?: Browser;
    page?: Page;
    async run(browser: Browser, page?: Page): Promise<void> {
        let stepCounter = 0
        if (!page)
            page = await ServicePortal.Open(browser) as Page
        else
            await ServicePortal.Open(page)

        do {
            let layoutType = await ServicePortal.GetLayoutType(page) //@TODO Implémenter le layout de la page "Installer" du Windows Store
            switch (layoutType) {
                case LAYOUT_TYPES.Tiles:
                    await ServicePortal.UnfoldAllTiles(page)
                    let tiles = await ServicePortal.GetAllTiles(page)
                    if(!tiles)
                        throw new Error("Pas réussi à récupérer les tiles");
                    (this.promptsTemplate.SELECT_TILE as any).choices = await ServicePortal.GetChoicesFromTiles(page, tiles)
                    let userChoice: { [index:string]:string } = await prompts(this.promptsTemplate.SELECT_TILE)
                    await Misc.ClickAndWaitForNetworkIdle(page, userChoice[PromptFields.TILES])
                    break;

                case LAYOUT_TYPES.Form:
                    await ServicePortal.FillForm(page, stepCounter) //@TODO implement error checking
                    const result = await ServicePortal.GoToFormNextStep(page, stepCounter)
                    if(typeof result === "string")
                        console.log("Créé ServiceRequest " + result)
                    break;
                default:
                    break;
            }
            stepCounter++
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