import { Console } from "console";
import { Browser, ElementHandle, HTTPResponse, Page } from "puppeteer"
import { isArray } from "util";
import { resourceLimits } from "worker_threads";
import { InputType } from "zlib";
import { prompts } from ".."
import { IDictionary } from "../types/IModule";
import { Choice, Prompt, PromptTypes } from "../types/prompt"
import { ComputerSearchResponse, Item } from "../types/ComputerSearchResponse";
import { Misc } from "./misc";
import { PersonSearchResponse } from "../types/PersonSearchResponse";
import { SoftwareSearchResponse } from "../types/SoftwareSearchResponse";

const TEXT_INPUT_REQUIRED = " (Nécessaire)"
const TEXT_INPUT_INVALID = "Merci d'entre au moins 3 caractères"

export enum INPUT_TYPES {
    Search = 0,
    Select,
    Text,
    Radio,
    Button,
    Unknown
}

/*interface INPUT_SEARCH {
    itx-searchbox:string;
}*/
const TYPE_FOR_INPUT: [INPUT_TYPES, PromptTypes][] = [
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
function GeneratePredicateFunc(elemToMatch: any) {
    //Génère une fonction de prédicat qui retourne true lorsque elemToMatch est trouvé dans l'array passé au prédicat (Fait pour être utilisé avec Array.find)
    return function (elems: any | any[]) {
        if (!Array.isArray(elems))
            elems = [elems]

        for (let elem in elems) {
            if (elem === elemToMatch)
                return true
        }
        return false
    }
}

async function GetInputToPromptMappingFromValue(value: INPUT_TYPES | PromptTypes): Promise<[INPUT_TYPES, PromptTypes]> {
    let typeTuple = TYPE_FOR_INPUT.find(GeneratePredicateFunc(value))
    if (!typeTuple || !Array.isArray(typeTuple) || typeTuple.length < 2)
        throw new Error("Pas trouvé de type de prompt pour l'input")

    return typeTuple
}

export class ServicePortal {
    static async Open(page: Page | Browser): Promise<Page> {
        if (isBrowser(page))   //Si page est de type "Browser"
            page = await page.newPage();

        await page.setCookie(langCookie);
        //Il faut set cet user agent, sinon les tuiles ne seront pas chargées
        await Misc.GotoAndWaitForSelector(page, URLs.SERVICE_PORTAL, Selectors.HOME_TILE_TITLE)
        return page
    }

    static async GetPromptTypeFromInput(inputType: INPUT_TYPES): Promise<PromptTypes> {
        return (await GetInputToPromptMappingFromValue(inputType))[1]
    }

    static async GetInputTypeFromPrompt(promptType: PromptTypes): Promise<INPUT_TYPES> {
        return (await GetInputToPromptMappingFromValue(promptType))[0]
    }

    static IsHomepage(page: Page): boolean {
        return page.url().includes(URLs.HOME_PAGE);
    }

    static async GetAllTiles(page: Page): Promise<ElementHandle<Element>[]> {
        return await page.$$(Selectors.TILE)
    }

    static async GetFormInputs(page: Page): Promise<ElementHandle<Element>[] | false> {
        return await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT);
    }

    static async GetFormInput(page: Page, index: number): Promise<ElementHandle<Element> | false> {
        const tmp = await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT, index);
        if (!tmp)
            return false
        return tmp[0]
    }

    static async GetFormTitles(page: Page): Promise<(string | false)[]> {
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
        if (!title)
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
    static async FillSearchInputAndGetResults(page: Page, input: ElementHandle<Element>, value: string): Promise<false | string[][]> {
        let result: boolean | string[][] = false
        input.type(value);
        page.setRequestInterception(true)
        page.on('response', async function (response: HTTPResponse) {
                let rawResponse = await response.json(),
                    parsedResponse,
                    GetRelevantData:(response:any) => string[][]

                if("SerialNumber" in rawResponse){
                    parsedResponse = rawResponse as ComputerSearchResponse
                    GetRelevantData = function(response:ComputerSearchResponse):string[][]{
                        let result = []
                        for(let item of response.Items){
                            result.push([item.DisplayName.Value, item.Status.Value, item.Region.Value])
                        }
                        return result
                    }
                }
                else if("UserPrincipalName" in rawResponse){
                    parsedResponse = rawResponse as PersonSearchResponse
                    GetRelevantData = function(response:PersonSearchResponse):string[][]{
                        let result = []
                        for(let item of response.Items){
                            result.push([item.DisplayName.Value, item.UserLogonName.Value])
                        }
                        return result
                    }
                }
                else if("Version" in rawResponse){
                    parsedResponse = rawResponse as SoftwareSearchResponse
                    GetRelevantData = function(response:SoftwareSearchResponse):string[][]{
                        let result = []
                        for(let item of response.Items){
                            if(item.ConfigItemHasPrice.Price1Amount === undefined)
                                var price = 0
                            else
                                var price = item.ConfigItemHasPrice.Price1Amount.Value
                            result.push([item.DisplayName.Value, item.Version.Value, item.Platform.Value, item.Region.Value, price.toString()])
                        }
                        return result
                    }
                }
                else
                    throw new Error("Unexpected response for search")

            if (rawResponse.Count >= 1) {
                result = GetRelevantData(rawResponse)
            }else
                result = true
        })
        while (!result) //@TODO Abort when waiting too long
            await Misc.sleep(10)
        return result
    }

    static async SetInputValue(page:Page, input: ElementHandle<Element> | ElementHandle<Element>[], value: boolean | string | ElementHandle):Promise<boolean|string[][]> {
        if (!Array.isArray(input))
            input = [input]

        const inputType = await this.GetInputType(input[0])
        switch (inputType) {
            case INPUT_TYPES.Radio:
                if (typeof value !== "boolean")
                    throw new Error("Résultat du prompt inattendu. \"Booléen\" attendu.")
                if (value)
                    input[0].click()
                else
                    input[1].click()
                return true

            case INPUT_TYPES.Select:
                if (!(value instanceof ElementHandle))
                    throw new Error("Résultat du prompt inattendu. \"ElementHandle\" attendu.")
                value.click();
                return true

            case INPUT_TYPES.Text:
                if (typeof value !== "string")
                    throw new Error("Résultat du prompt inattendu. \"String\" attendu.")
                input[0].type(value)
                return true

            case INPUT_TYPES.Search:
                if (typeof value !== "string")
                    throw new Error("Résultat du prompt inattendu. \"String\" attendu.")
                return await this.FillSearchInputAndGetResults(page, input[0], value)

            case INPUT_TYPES.Unknown:
                console.log("Unknown input")
                return false
            default:
                console.log("Unknown input")
                return false
        }
    }

    static async IsInputRequired(input:ElementHandle):Promise<boolean>{
        return await input.evaluate(el => (el.querySelector(Selectors.CLASS_INPUT_REQUIRED) !== null))
    }

    static async FillForm(page: Page): Promise<void> {

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
            result: Prompt[] = []
        while (input = (await ServicePortal.GetFormInput(page, i))) { // GetFormInputs retourne False quand aucun élément n'est trouvé. L'évaluation d'une assignation en JS retournera toujours la valeur assignée
            title = (await ServicePortal.GetFormTitle(page, i))
            if (!title)
                throw new Error("Pas trouvé le titre de l'input")
    
            let prompt = await ServicePortal.CreatePromptFromInput(input, title, 'TMP')
            let answer: boolean|string|ElementHandle<Element> = (await prompts(prompt))['TMP']
    
            if(prompt.type == PromptTypes.toggle){
                let tmp = (await ServicePortal.GetFormInput(page, ++i))
                if(!tmp)
                    throw new Error("Pas trouvé le second radio input")
                input = [input, tmp]
            }
            let response = await this.SetInputValue(page, input, answer)

            //Si l'utilisateur a fait une recherche et il y a plus d'un résultat 
            if(await this.GetInputTypeFromPrompt(prompt.type) == INPUT_TYPES.Search && Array.isArray(response)){ 
                    let choices:Choice[] = []
                    const lines = Misc.FormatStringRows(response)
                    for(let i = 0; i < response.length;i++)
                        choices.push({title:lines[i],value:response[i][0]}) //@TODO Trouver quelque chose de plus solide. Actuellement, il faut que la valeur demandée soit le premier élement de chaque ligne

                    if(Array.isArray(input))
                        throw new Error("Unexpected : Input is array, should be single value")

                    prompt = await ServicePortal.CreatePromptFromInput(input,title, 'TMP', choices)
                    answer = (await prompts(prompt))['TMP']
                    await this.SetInputValue(page, input, answer)
            }
            i++
        }

    }
    
    static async SubmitAndGetSR(page:Page, btnSubmit:ElementHandle):Promise<string|false>{
        btnSubmit.click()
        const srElem = await page.waitForSelector(Selectors.POPUP_SR_NUMBER)
        if(!srElem)
            throw new Error("Couldn't find SR number")
        const num = await Misc.GetTextFromElement(srElem)
        if(!num)
            throw new Error("Couldn't get number from modal element")
        const closeBtn = await page.$(Selectors.POPUP_CLOSE_BUTTON)
        if(!closeBtn)
            throw new Error("Couldn't find the button to close the new SR popup")
        await Misc.ClickAndWaitForLoad(page,closeBtn)

        return num
    }

    static async GoToFormNextStep(page:Page):Promise<boolean|string>{
        const nextStepBtn = await page.$(Selectors.BUTTON_NEXT)
        if(nextStepBtn){
            await Misc.ClickAndWaitForLoad(page,nextStepBtn)
            return true
        }
        const submitBtn = await page.$(Selectors.BUTTON_SUBMIT)

        if(!submitBtn)
            return false
        return await this.SubmitAndGetSR(page, submitBtn)
    }

    static async GetChoicesFromTiles(tiles: ElementHandle<Element>[]): Promise<Choice[]> {
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

    static async CreatePromptFromInput(input: ElementHandle, text: string, name: string, choices:Choice[] | undefined = undefined): Promise<Prompt> {
        const inputType:INPUT_TYPES = await this.GetInputType(input)
        const inputRquired = await this.IsInputRequired(input)
        if (!inputType)
            throw new Error("Pas trouvé le type de l'input")

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
        let type:PromptTypes

        if(inputType as INPUT_TYPES == INPUT_TYPES.Search && choices !== undefined)
            type = PromptTypes.autocomplete
        else            
            type = await this.GetPromptTypeFromInput(inputType)

        return {
            message: text + (inputRquired)?TEXT_INPUT_REQUIRED:'',
            name: name,
            type: type,
            choices: choices,
            validate:(inputRquired && (inputType != (INPUT_TYPES.Radio | INPUT_TYPES.Button | INPUT_TYPES.Unknown)))?this.ValidateRequiredUserInput:undefined
        }
    }

    static ValidateRequiredUserInput(value:string):boolean|string{
        return (value.length >= 3)?true:TEXT_INPUT_INVALID
    }

    static async GetInputType(input: ElementHandle): Promise<INPUT_TYPES> {
        return await input.evaluate(
            function (el: Element, types: [INPUT_TYPES, Selectors][]): INPUT_TYPES {
                for (let type of types) {
                    let inputFound = el.querySelector(type[1])
                    if (!inputFound)
                        return type[0]
                }
                return INPUT_TYPES.Unknown
            }, TYPE_FOR_INPUT)
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
    //MAIN_FORM_INPUT = 'textarea:visible, div.row.question input.form-control:visible, [type="radio"]:visible',
    MAIN_FORM_INPUT = 'div.row.question',
    MAIN_FORM_INPUT_TITLE = '.step-content div.row.question .wrap-bl > span:first-of-type:visible' /*'textarea, div.row.question input.form-control'*/,
    INPUT_SEARCH = '.selectCategoryInput',
    INPUT_SELECT = '.selectCategory:has([readonly="readonly"]):visible',
    INPUT_SELECT_VALUES = 'li a',
    INPUT_TEXT = '[data-outname="String"]',
    INPUT_RADIO = '[type="radio"]',
    BUTTON_NEXT = '[ng-click="nextPage()"]:visible',
    BUTTON_SUBMIT = '[ng-click="submitForm()"]:visible',
    CLASS_INPUT_REQUIRED = '.required-field',
    POPUP_SR_NUMBER = ".modal-dialog:visible a",
    POPUP_CLOSE_BUTTON = ".modal-dialog:visible button:visible"
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