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
            type: PromptTypes.autocomplete, //Meilleur recherche via le paramètre suggest
            name: PromptFields.TILES,
            message: "Sélectionner la tuile",
            suggest:ServicePortal.SuggestSpaceSeparatedExactMatch
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
                    await ServicePortal.UnfoldAllTiles(page)
                    let tiles = await ServicePortal.GetAllTiles(page)
                    if(!tiles)
                        throw new Error("Pas réussi à récupérer les tiles");
                    (this.promptsTemplate.SELECT_TILE as any).choices = await ServicePortal.GetChoicesFromTiles(tiles)
                    let userChoice: { [index:string]:string } = await prompts(this.promptsTemplate.SELECT_TILE)
                    await Misc.ClickAndWaitForNetworkIdle(page, userChoice[PromptFields.TILES])
                    break;

                case LAYOUT_TYPES.Form:
                    await ServicePortal.FillForm(page)
                    const result = await ServicePortal.GoToFormNextStep(page) //@TODO waits indefinitely on "Étape suivante"
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