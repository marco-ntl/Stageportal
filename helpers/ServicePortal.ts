import { Browser, ElementHandle, Page } from "puppeteer"
import { isArray } from "util";
import { prompts } from ".."
import { Prompt } from "../types/prompt"
import { Misc } from "./misc";

//Code récupéré dans node_modules/@types/puppeteer/index.d.ts
//Le compileur ne veut pas reconnaître l'import, obligé de l'importer manuellement)))))))
interface Cookie {
    /** The cookie name. */
    name: string;
    /** The cookie value. */
    value: string;
    /** The cookie domain. */
    domain?: string;
    /** The cookie path. */
    path?: string;
    /** The cookie Unix expiration time in seconds. */
    expires?: number;
    /** The cookie size */
    size?: number;
    /** The cookie http only flag. */
    httpOnly?: boolean;
    /** The session cookie flag. */
    session?: boolean;
    /** The cookie secure flag. */
    secure?: boolean;
    /** The cookie same site definition. */
    sameSite?: "Strict" | "Lax";
}

//Permet de s'assurer que le site est bien en anglais, utile car les tiles sont reconnues par texte
const langCookie: Cookie = {
    name: "currentLanguageCode",
    value: "fr",
    domain: "serviceportal.srgssr.ch"
}

function isBrowser(arg: any): arg is Browser {
    return arg && "newPage" in arg;
}

export class ServicePortal {
    static async Open(page: Page | Browser): Promise<Page> {
        if ("newPage" in page)   //Si page est de type "Browser"
            page = await page.newPage();

        await page.setCookie(langCookie);
        //Il faut set cet user agent, sinon les tuiles ne seront pas chargées
        await Misc.GotoAndWaitForSelector(page, URLs.SERVICE_PORTAL, Selectors.HOME_TILE_TITLE)
        return page
    }

    static IsHomepage(page: Page): boolean {
        return page.url().includes(URLs.HOME_PAGE);
    }

    static async GetAllTiles(page: Page): Promise<ElementHandle<Element>[]> {
        return await page.$$(Selectors.TILE)
    }

    static async CreatePromptsFromInputs(inputs: ElementHandle[] | ElementHandle): Promise<Prompt | Prompt[]> {
        if (!isArray(inputs))
            inputs = [inputs]
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
        for (let input of inputs) {
            const is = await input.getProperties()
        }
        return prompts('ayy')
    }

    static async GetLayoutType(page: Page): Promise<LAYOUT_TYPES> {
        const hasTiles = await page.$(Selectors.TILE) || false, //page.$() retourne null si l'élément n'existe pas. null OR false = false
            findForm = page.$(Selectors.FORM) //Il n'y aura pas forcément besoin de checker si la page contient une form, donc on évite d'attendre pour le moment

        if (hasTiles) // /!\ Il faut vérifier si la page contient des tiles avant de vérifier si elle contient une form, car certaines form contiennent des tiles
            return LAYOUT_TYPES.Tiles

        //On attends maintenant que c'est nécessaire
        const hasForm = await findForm || false
        if (hasForm)
            return LAYOUT_TYPES.Form

        console.log("Unknown layout type")
        return LAYOUT_TYPES.Unknown

    }

    static async GetTitleFromTile(el: ElementHandle<Element>): Promise<string | false> {
        const text = await (await el.$(Selectors.TILE_TITLE))?.evaluate(elem => elem.textContent)
        return text || false
    }

}

export enum Selectors {
    //Si l'élément est un input ou un textarea
    FORM_INPUTS = ':is(input, textarea)',
    IS_LOADING = '.loading-center',
    TILE_TITLE = 'h1,h2,h3,h4,b', //Le titre d'une tile est toujours en gras
    HOME_TILE_TITLE = '.card-title.ro-title',
    TILE = '.card-block',
    FORM = '[name="requestForm"]' // /!\ Il faut vérifier si la page contient des tiles avant de vérifier si elle contient une form, car certaines form contiennent des tiles
}

export class URLs {
    static SERVICE_PORTAL = "https://serviceportal.srgssr.ch"
    static HOME_PAGE = URLs.SERVICE_PORTAL + "/EndUser/Items/Home"
}

export enum LAYOUT_TYPES {
    Form,
    Tiles,
    Unknown
}

/*interface INPUT_SEARCH {
    itx-searchbox:string;
}*/
