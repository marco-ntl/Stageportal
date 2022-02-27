import { Browser, ElementHandle, Page } from "puppeteer"
import { isArray } from "util";
import { resourceLimits } from "worker_threads";
import { InputType } from "zlib";
import { prompts } from ".."
import { IDictionary } from "../types/IModule";
import { Choice, Prompt, PromptTypes } from "../types/prompt"
import { Misc } from "./misc";

export enum INPUT_TYPES {
    Search,
    Select,
    Text,
    Radio,
    Button,
    Unknown
}

/*interface INPUT_SEARCH {
    itx-searchbox:string;
}*/
const TYPE_FOR_INPUT:[INPUT_TYPES,PromptTypes][] = [
    [INPUT_TYPES.Radio, PromptTypes.confirm],
    [INPUT_TYPES.Select, PromptTypes.select],
    [INPUT_TYPES.Search, PromptTypes.text],
    [INPUT_TYPES.Text, PromptTypes.text],
]

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
function GeneratePredicateFunc(elemToMatch:any){
    //Génère une fonction de prédicat qui retourne true lorsque elemToMatch est trouvé dans l'array passé au prédicat (Fait pour être utilisé avec Array.find)
    return function(elems:any | any[]){
        if(!Array.isArray(elems))
            elems = [elems]
        
        for(let elem in elems){
            if(elem === elemToMatch)
                return true
        }
        return false
    }
}

async function GetInputToPromptMappingFromValue(value:INPUT_TYPES | PromptTypes):Promise<[INPUT_TYPES,PromptTypes]>{
    let typeTuple = TYPE_FOR_INPUT.find(GeneratePredicateFunc(value))
    if (!typeTuple || !Array.isArray(typeTuple) || typeTuple.length < 2)
        throw new Error("Pas trouvé de type de prompt pour l'input")

    return typeTuple
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

    static async GetPromptTypeFromInput(inputType:INPUT_TYPES):Promise<PromptTypes>{
        return (await GetInputToPromptMappingFromValue(inputType))[1]
    }

    static async GetInputTypeFromPrompt(promptType:PromptTypes):Promise<INPUT_TYPES>{
        return (await GetInputToPromptMappingFromValue(promptType))[0]
    }

    static IsHomepage(page: Page): boolean {
        return page.url().includes(URLs.HOME_PAGE);
    }

    static async GetAllTiles(page: Page): Promise<ElementHandle<Element>[]> {
        return await page.$$(Selectors.TILE)
    }

    static async GetFormInputs(page: Page): Promise<ElementHandle<Element>[] | false> {
        return await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT_TITLE);
    }

    static async GetFormInput(page: Page, index: number): Promise<ElementHandle<Element>|false> {
        const tmp = await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT_TITLE, index);
        if(!tmp)
            return false
        return tmp[0]
    }

    static async GetFormTitles(page: Page): Promise<(string|false)[]> {
        let elems = await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT_TITLE);
        if (!elems)
            return [false]
        return await Promise.all(elems.map(async el => await Misc.GetTextFromElement(el)))
    }

    static async GetFormTitle(page: Page, index: false | number = false): Promise<string | false> {
        let elems = await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT_TITLE);
        if (!elems)
            return false
        const title = await Promise.all(elems.map(async el => await Misc.GetTextFromElement(el)))
        if(!title)
            return false
        return title[0]
    }

    static async GetMatchingElements(page: Page, selector: string, index: false | number = false): Promise<ElementHandle<Element>[] | false> {
        const result = await page.$$(selector);
        if (result.length <= 0)
            return false
        if (index)
            return [result[index]]
        return result
    }

    static async SetInputValue(input: ElementHandle<Element> | ElementHandle<Element>[], value: boolean | string | Element) {
        if (!Array.isArray(input))
            input = [input]

        const inputType = await this.GetInputType(input[0])
        switch (inputType) {
            case INPUT_TYPES.Radio:
                if (typeof value !== "boolean")
                    throw new Error("Résultat du prompt inattendue. \"Booléen\" attendu.")
                if (value)
                    input[0].click()
                else
                    input[1].click()
                break;
            //@TODO Implémenter autre types d'inputs
            default:
                break;
        }
    }

    static async CreatePromptFromInput(input: ElementHandle, text: string, name: string): Promise<Prompt> {
        const inputType = await this.GetInputType(input)
        if (!inputType)
            throw new Error("Pas trouvé le type de l'input")

        let choices = undefined

        if (inputType === INPUT_TYPES.Select) {
            const elems = await input.$$(Selectors.INPUT_SELECT_VALUES)
            choices = await Promise.all(elems.map(
                async function (elem): Promise<Choice> {
                    const text = await Misc.GetTextFromElement(elem)
                    if (!text)
                        throw new Error("Pas réussi à récupérer les choix du select");
                    return { title: text, value: elem }
                }))
        }
        const type = await this.GetPromptTypeFromInput(inputType)

        return {
            message: text,
            name: name,
            type: type,
            choices: choices
        }
    }


    static async GetInputType(input: ElementHandle): Promise<INPUT_TYPES> {
        const TypeArr = [
            [INPUT_TYPES.Radio, Selectors.INPUT_RADIO],
            [INPUT_TYPES.Search, Selectors.INPUT_SEARCH],
            [INPUT_TYPES.Select, Selectors.INPUT_SELECT],
            [INPUT_TYPES.Text, Selectors.INPUT_TEXT],
        ]
        return await input.evaluate(
            function (el: Element, types: [INPUT_TYPES, Selectors][]): INPUT_TYPES {
                for (let type in types) {
                    if (el.matches(type[1]))
                        return (type[0] as unknown as INPUT_TYPES) //Obligé de convertir type en unkown d'abord, aucune idée de pourquoi mais marre de me casser la tête
                }
                return INPUT_TYPES.Unknown
            }, input, TypeArr)
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
        return await Misc.GetTextFromElement(await el.$(Selectors.TILE_TITLE))
    }

}

//All inputs -> 'textarea, div.row.question input.form-control'
//Search (E.g user name) -> .selectCategoryInput
//  Get network request on submit -> get results as json :)
//Select (E.g device type) -> [readonly="readonly"]
//  Values -> $('.dropdown-menu').children()
//Text (Single line, textarea) -> [data-outname="String"]
//Radio -> [type="radio"]
//Button next -> ng-click="nextPage()"
//Button submit -> [ng-click="submitForm()"] 

export enum Selectors {
    IS_LOADING = '.loading-center',
    TILE_TITLE = 'h1,h2,h3,h4,b', //Le titre d'une tile est toujours en gras
    HOME_TILE_TITLE = '.card-title.ro-title',
    TILE = '.card-block',
    FORM = '[name="requestForm"]', // /!\ Il faut vérifier si la page contient des tiles avant de vérifier si elle contient une form, car certaines form contiennent des tiles
    MAIN_FORM_INPUT = 'textarea:visible, div.row.question input.form-control:visible, [type="radio"]:visible',
    MAIN_FORM_INPUT_TITLE = '.step-content div.row.question .wrap-bl > span:first-of-type:visible' /*'textarea, div.row.question input.form-control'*/,
    INPUT_SEARCH = '.selectCategoryInput',
    INPUT_SELECT = '.selectCategory:has([readonly="readonly"]):visible',
    INPUT_SELECT_VALUES = 'li a',
    INPUT_TEXT = '[data-outname="String"]',
    INPUT_RADIO = '[type="radio"]',
    BUTTON_NEXT = '[type="radio"]',
    BUTTON_SUBMIT = '[ng-click="submitForm()"]',

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