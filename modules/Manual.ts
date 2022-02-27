import { Browser, ElementHandle, Page } from "puppeteer";
import { Choice, Prompt, PromptTypes } from "../types/prompt";
import { Argument, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { LAYOUT_TYPES, ServicePortal, URLs, Selectors } from "../helpers/ServicePortal";
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
                    (this.promptsTemplate.SELECT_TILE as any).choices = await GetChoicesFromTiles(tiles)
                    let userChoice = await prompts(this.promptsTemplate.SELECT_TILE)
                    await Misc.ClickAndWaitForSelector(page, userChoice[PromptFields.TILES], Selectors.IS_LOADING, true)
                    break;

                case LAYOUT_TYPES.Form:
                //@TODO Finir fonction pour GeneratePromptFromInputs
                //If type == form et aucun input trouvé, select avec les boutons

                default:
                    break;
            }
            //@TODO Finir fonction pour lister tuiles, créer autocomplete avec toutes les tuiles
            //@TODO Finir GeneratePromptFromInputs, implémenter navigation
        } while (!page.url().includes(URLs.HOME_PAGE))
    }
}

async function GetChoicesFromTiles(tiles: ElementHandle<Element>[]): Promise<Choice[]> {
    const result: Choice[] = [];
    for (let tile of tiles) {
        const text = await ServicePortal.GetTitleFromTile(tile);
        if (!text) {
            throw new Error("Can't find tile text")
        }
        result.push({ title: text, value: tile });
    }
    return result;
}



enum PromptFields {
    TILES = "tiles"
}

/*interface INPUT_SEARCH {
    itx-searchbox:string;
}*/

export = new Manual()