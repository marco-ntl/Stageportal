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
                    (this.promptsTemplate.SELECT_TILE as any).choices = await GetChoicesFromTiles(tiles)
                    let userChoice = await prompts(this.promptsTemplate.SELECT_TILE)
                    await Misc.ClickAndWaitForSelector(page, userChoice[PromptFields.TILES], Selectors.IS_LOADING, true)
                    break;

                case LAYOUT_TYPES.Form:
                //@TODO Finir fonction Fillform
                    FillForm(page)
                default:
                    break;
            }
            //@TODO Finir fonction pour lister tuiles, créer autocomplete avec toutes les tuiles
            //@TODO Finir GeneratePromptFromInputs, implémenter navigation
        } while (!page.url().includes(URLs.HOME_PAGE))
    }
}

async function FillForm(page: Page): Promise<void> {

    //@TODO Finish this
    //All inputs -> 'textarea, div.row.question input.form-control'
    //Search (E.g user name) -> .selectCategoryInput
    //  Get network request on submit -> get results as json :)
    //Select (E.g device type) -> [readonly="readonly"]
    //  Values -> $('.dropdown-menu').children()
    //Text (Single line, textarea) -> [data-outname="String"]
    //Radio -> [type="radio"]
    //Button next -> ng-click="nextPage()"
    //Button submit -> [ng-click="submitForm()"] 
    //Get all inputs
    //for each input -> get type
    //generate prompt for input type
    //??????
    //profit
    let i = 0,
        input: ElementHandle<Element> | ElementHandle<Element>[] | false,
        title: string | false,
        inputType: INPUT_TYPES | false,
        choices: undefined | Choice[],
        result: Prompt[] = []
    while (input = (await ServicePortal.GetFormInput(page, i))) { // GetFormInputs retourne False quand aucun élément n'est trouvé. L'évaluation d'une assignation en JS retournera toujours la valeur assignée
        title = (await ServicePortal.GetFormTitle(page, i))
        if (!title)
            throw new Error("Pas trouvé le titre de l'input")

        const prompt = await ServicePortal.CreatePromptFromInput(input, title, 'TMP')
        const answer = await prompts(prompt)
        if(prompt.type == PromptTypes.toggle){
            let tmp = (await ServicePortal.GetFormInput(page, ++i))
            if(!tmp)
                throw new Error("Pas trouvé le second radio input")
            input = [input, tmp]
        }
        //@TODO Finir SetInput puis SetInput(input, answer['tmp'])
        i++
    }
    //@TODO (btnNext | btnSend).click()
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