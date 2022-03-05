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
const ID_TILE = 'SPtile'
const ID_INPUT = 'SPinput'
const ID_INNER_INPUT = 'SPinner'
const ID_INPUT_SELECT_VALUES = 'SPSelectVal'
const ID_SELECTED_VALUE = 'SPselected'
const ID_FOLD_HEADER = 'SPfold'
const ID_RADIO_INPUT = 'SPradio'
const API_GET_SEARCH_RESULTS = 'GetQueryResultData'

const SHOULD_SEARCH_RESULTS_HAVE_HEADERS = true

export enum Selectors {
    IS_LOADING = '.loading-center',
    TILE_TITLE = 'h1,h2,h3,h4,b', //Le titre d'une tile est toujours en gras
    HOME_TILE_TITLE = '.card-title.ro-title',
    TILE = '.card-block',
    FORM = '[name="requestForm"]', // /!\ Il faut vérifier si la page contient des tiles avant de vérifier si elle contient une form, car certaines form contiennent des tiles
    //MAIN_FORM_INPUT = 'textarea:visible, div.row.question input.form-control:visible, [type="radio"]:visible',
    MAIN_FORM_INPUT = '.active div.row.question',
    MAIN_FORM_INPUT_TITLE = '.active .step-content div.row.question .wrap-bl > span:first-of-type' /*'textarea, div.row.question input.form-control'*/,
    INPUT_SEARCH = '.selectCategoryInput',
    INPUT_SEARCH_VALUES = '.active .ui-grid-viewport .ui-grid-icon-singleselect',
    INPUT_SEARCH_SUBMIT_BTN = '.active .search-tbl',
    INPUT_SELECT = '.selectCategory[readonly="readonly"]',
    INPUT_SELECT_VALUES = 'li a',
    INPUT_TEXT = '[data-outname="String"]',
    INPUT_RADIO = '[type="radio"]',
    BUTTON_NEXT = '.active [ng-click="nextPage()"]',
    BUTTON_SUBMIT = '.active [ng-click="submitForm()"]',
    CLASS_INPUT_REQUIRED = '.required-field',
    POPUP_SR_NUMBER = ".modal-dialog a",
    POPUP_CLOSE_BUTTON = ".modal-dialog button",
    TILE_FOLD_ELEM = '.collapse-item-bl.hidden-content',
    INNER_INPUT = 'input:not([type="hidden"])',
    

}

export class URLs {
    static SERVICE_PORTAL = "https://serviceportal.srgssr.ch"
    static HOME_PAGE = URLs.SERVICE_PORTAL + "/EndUser/Items/Home"
}

export enum LAYOUT_TYPES {
    Form = 'Form',
    Tiles = 'Tiles',
    Unknown = 'Unknown',
}
export enum INPUT_TYPES {
    Search = 'Search',
    Select = 'Select',
    Text = 'Text',
    Radio = 'Radio',
    Button = 'Button',
    Unknown = 'Unknown'
}

export enum RESPONSE_HEADERS {
    Name = 'Nom',
    Version = 'Version',
    Platform = 'Plate-forme',
    Region = 'Région',
    Price = 'Prix',
    LogonName = 'Nom d\'utilisateur',
    Status = 'Statut',
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

const SELECTORS_FOR_TYPES: [Selectors, INPUT_TYPES][] = [
    [Selectors.INPUT_RADIO, INPUT_TYPES.Radio],
    [Selectors.INPUT_SELECT, INPUT_TYPES.Select],
    [Selectors.INPUT_SEARCH, INPUT_TYPES.Search],
    [Selectors.INPUT_TEXT, INPUT_TYPES.Text],
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

        for (let elem of elems) {
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

    static async GetAllTiles(page: Page): Promise<ElementHandle<Element>[] | false> {
        return await Misc.GetMultipleElemsBySelector(page, Selectors.TILE)
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
        if (!index)
            return title[0]
        else
            return title[index]
    }

    static async GetMatchingElements(page: Page, selector: string, index: false | number = false): Promise<ElementHandle<Element>[] | false> {

        let result = await Misc.GetMultipleElemsBySelector(page, selector)
        if (!result || result.length <= 0)
            return false

        if (index)
            return [result[index]]
        return result
    }

    static async UnfoldAllTiles(page: Page) {
        let headers = await Misc.GetMultipleElemsBySelector(page, Selectors.TILE_FOLD_ELEM)
        if (!headers)
            return //Pas d'erreur, si aucun header n'est trouvé l'éxécution reprends sans se pauser

        let i = 0
        for (let header of headers) {
            const id = await Misc.SetElemID(header, ID_FOLD_HEADER + i)
            await Misc.ClickOnElem(page, id)
            i++
        }
    }
    static async ParseSearchResponse(response: HTTPResponse): Promise<string[][] | boolean> {
        let rawResponse = await response.json(),
            parsedResponse,
            result: string[][] = []
        if (!("Count" in rawResponse) || !("Items" in rawResponse))
            throw new Error("Unexpected response for search")

        if (rawResponse.Count === 0)
            return false
        else if (rawResponse.Count === 1)
            return true
        else {
            if ("SerialNumber" in rawResponse.Items[0]) {
                parsedResponse = rawResponse as ComputerSearchResponse
                if (SHOULD_SEARCH_RESULTS_HAVE_HEADERS)
                    result = [[RESPONSE_HEADERS.Name, RESPONSE_HEADERS.Status, RESPONSE_HEADERS.Region]]
                for (let item of parsedResponse.Items) {
                    result.push([item.DisplayName.Value, item.Status.Value, item.Region.Value])
                }
                return result
            }
            else if ("UserPrincipalName" in rawResponse.Items[0]) {
                parsedResponse = rawResponse as PersonSearchResponse
                if (SHOULD_SEARCH_RESULTS_HAVE_HEADERS)
                    result = [[RESPONSE_HEADERS.Name, RESPONSE_HEADERS.LogonName]]
                for (let item of parsedResponse.Items) {
                    result.push([item.DisplayName.Value, item.UserLogonName.Value])
                }
                return result
            }
            else if ("Version" in rawResponse.Items[0]) {
                let price
                parsedResponse = rawResponse as SoftwareSearchResponse
                if (SHOULD_SEARCH_RESULTS_HAVE_HEADERS)
                    result = [[RESPONSE_HEADERS.Name, RESPONSE_HEADERS.Version, RESPONSE_HEADERS.Platform, RESPONSE_HEADERS.Region, RESPONSE_HEADERS.Price]]

                for (let item of parsedResponse.Items) {
                    if (item?.ConfigItemHasPrice?.Price1Amount?.Value)
                        price = item.ConfigItemHasPrice.Price1Amount.Value
                    else
                        price = 0
                    result.push([item.DisplayName.Value, item.Version.Value, item.Platform.Value, item.Region.Value, price.toString()])
                }
                return result
            } else
                throw new Error("Unexpected response type from search")
        }
    }

    static async FillSearchInputAndGetResults(page: Page, inputSelector: string, value: string): Promise<boolean | string[][]> {
        await Misc.FocusElemAndType(page, inputSelector, value)
        await Misc.ClickOnElem(page, Selectors.INPUT_SEARCH_SUBMIT_BTN)
        const response = await page.waitForResponse(response => response.url().includes(API_GET_SEARCH_RESULTS))
        return await this.ParseSearchResponse(response)
    }

    static async SetInputValue(page: Page, inputSelector: string | string[], value: boolean | string): Promise<boolean | string[][]> {
        if (!Array.isArray(inputSelector))
            inputSelector = [inputSelector]

        const inputType = await this.GetInputType(page, inputSelector[0])
        switch (inputType) {
            case INPUT_TYPES.Radio: //@TODO Untested
                if (typeof value !== "boolean")
                    throw new TypeError("Résultat du prompt inattendu. \"Booléen\" attendu.")
                if (value)
                    Misc.ClickOnElem(page, inputSelector[0])
                else
                    Misc.ClickOnElem(page, inputSelector[1])
                return true

            case INPUT_TYPES.Select: //@TODO Untested
                if (typeof value !== "string")
                    throw new TypeError("Résultat du prompt inattendu. \"String\" attendu.")
                const elem = await Misc.GetElemBySelector(page, value)
                if (!elem)
                    throw new Error("Pas trouvé de valeur d'input correspondant au sélecteur " + value)
                await Misc.ClickOnElem(page, value)
                return true

            case INPUT_TYPES.Text: //@TODO Untested
                if (typeof value !== "string")
                    throw new Error("Résultat du prompt inattendu. \"String\" attendu.")
                await Misc.FocusElemAndType(page, inputSelector[0], value)
                return true

            case INPUT_TYPES.Search:
                if (typeof value !== "string")
                    throw new Error("Résultat du prompt inattendu. \"String\" attendu.")
                return await this.FillSearchInputAndGetResults(page, inputSelector[0], value)

            case INPUT_TYPES.Unknown:
            default:
                console.log("Unknown input")
                return false
        }
    }

    static async IsInputRequired(page: Page, inputSelector: string): Promise<boolean> {
        const input = await Misc.GetElemBySelector(page, inputSelector)
        if (!input)
            throw new Error("Pas trouvé d'input correspondant au sélecteur " + inputSelector)
        return await input.evaluate((el, selector) => (el.querySelector(selector) !== null), Selectors.CLASS_INPUT_REQUIRED)
    }

    static async FillForm(page: Page): Promise<void> {
        let i = 0,
            input: ElementHandle<Element> | ElementHandle<Element>[] | false,
            innerInput: ElementHandle<Element> | ElementHandle<Element>[] | null,
            inputID: string | string[],
            innerInputID: string[],
            title: string | false,
            result: Prompt[] = []
        await page.waitForTimeout(1000) //@TODO trouver quelque chose de plus solide. Nécessaire car certaines forms (eg assign) chargent d'abord une étape "get user"
        while (input = (await ServicePortal.GetFormInput(page, i))) { // GetFormInputs retourne False quand aucun élément n'est trouvé. L'évaluation d'une assignation en JS retournera toujours la valeur assignée
            title = (await ServicePortal.GetFormTitle(page, i))
            inputID = await Misc.SetElemID(input, ID_INPUT + i)

            if (!title)
                throw new Error("Pas trouvé le titre de l'input")

            let prompt = await ServicePortal.CreatePromptFromInput(page, inputID, title, 'TMP')
            let answer: boolean | string = (await prompts(prompt))['TMP']


            if (prompt.type === PromptTypes.toggle) {
                innerInputID = [await Misc.SetElemID(input, ID_INNER_INPUT + i)]
                const tmp = (await ServicePortal.GetFormInput(page, ++i))
                if (!tmp)
                    throw new Error("Pas trouvé le second radio input")
                innerInputID.push(await Misc.SetElemID(tmp, ID_INNER_INPUT + i))
            } else {
                innerInput = await input.$(Selectors.INNER_INPUT)
                if (!innerInput)
                    throw new Error("Pas réussi à trouver l'élément DOM input dans le bloc " + i)
                innerInputID = [await Misc.SetElemID(innerInput, ID_INNER_INPUT + i)]
            }

            if (innerInputID.length <= 0)
                throw new Error("Pas réussi à trouver l'input dans le bloc")

            let response = await this.SetInputValue(page, innerInputID, answer)

            //Si l'utilisateur a fait une recherche et il y a plus d'un résultat 
            if (await this.GetInputTypeFromPrompt(prompt.type) == INPUT_TYPES.Search && Array.isArray(response)) {
                let choices: Choice[] = []
                const lines = Misc.FormatStringRows(response)
                for (let i = 0; i < response.length; i++)
                    choices.push({ title: lines[i], value: i })

                if (Array.isArray(input))
                    throw new Error("Unexpected : Input is array, should be single value")

                prompt = await ServicePortal.CreatePromptFromInput(page, inputID, "Résultats de la recherche :", 'TMP', choices)
                let answerIndex = (await prompts(prompt))['TMP']
                const searchResults = await Misc.GetMultipleElemsBySelector(page, Selectors.INPUT_SEARCH_VALUES)
                if (!searchResults || searchResults.length < answerIndex)
                    throw new Error("Failed to select search values")
                if(SHOULD_SEARCH_RESULTS_HAVE_HEADERS){
                    if(answerIndex === 0)
                        throw new Error("Merci de ne pas sélectionner les en-têtes des résultats de recherche")
                    else
                        answerIndex = parseInt(answerIndex) - 1
                }

                await Misc.ClickOnElem(page, await Misc.SetElemID(searchResults[answerIndex], ID_SELECTED_VALUE))
            }
            i++
        }

    }

    static async SubmitAndGetSR(page: Page, elemSelector: string): Promise<string | false> {
        await page.click(elemSelector)
        const srElem = await page.waitForSelector(Selectors.POPUP_SR_NUMBER)
        if (!srElem)
            throw new Error("Couldn't find SR number")
        const num = await Misc.GetTextFromElement(srElem)
        if (!num)
            throw new Error("Couldn't get number from modal element")
        const closeBtn = Misc.GetElemBySelector(page, Selectors.POPUP_CLOSE_BUTTON)
        if (!closeBtn)
            throw new Error("Couldn't find the button to close the new SR popup")
        await Misc.ClickAndWaitForLoad(page, Selectors.POPUP_CLOSE_BUTTON)

        return num
    }

    static async GoToFormNextStep(page: Page): Promise<boolean | string> {
        const nextStepBtn = await page.$(Selectors.BUTTON_NEXT)
        if (nextStepBtn) {
            await Misc.ClickAndWaitForLoad(page, Selectors.BUTTON_NEXT)
            return true
        }
        const submitBtn = await Misc.GetElemBySelector(page, Selectors.BUTTON_SUBMIT)

        if (!submitBtn)
            return false
        return await this.SubmitAndGetSR(page, Selectors.BUTTON_SUBMIT)
    }

    static async GetChoicesFromTiles(tiles: ElementHandle<Element>[]): Promise<Choice[]> {
        const result: Choice[] = [];
        let text: string | false,
            value: string,
            i = 0
        for (let tile of tiles) {
            text = await ServicePortal.GetTitleFromTile(tile);
            if (!text)
                throw new Error("Can't get title from tile")

            value = await Misc.SetElemID(tile, ID_TILE + i)
            if (!text) {
                throw new Error("Can't find tile text")
            }
            result.push({ title: text, value: value });
            i++
        }
        return result;
    }

    static async SuggestSpaceSeparatedExactMatch(input: string, choices: Choice[]): Promise<Choice[]> { //Split input à chaque espace, et retourne les éléments qui contiennent chacun des mots obtenus ainsi
        return await choices.filter(elem => Misc.IncludesAll(elem.title, input.split(' ')))
    }

    static async CreatePromptFromInput(page: Page, inputSelector: string, text: string, name: string, choices: Choice[] | undefined = undefined): Promise<Prompt> {
        const inputType: INPUT_TYPES = await this.GetInputType(page, inputSelector)
        const inputRquired = await this.IsInputRequired(page, inputSelector)
        if (!inputType)
            throw new Error("Pas trouvé le type de l'input")
        let i: number = 0
        if (inputType === INPUT_TYPES.Select) {
            const elems = await Misc.GetMultipleElemsBySelector(page, Selectors.INPUT_SELECT_VALUES)
            if (!elems)
                throw new Error("Pas trouvé les valeurs du select " + inputSelector)
            choices = await Promise.all(elems.map(
                async function (elem): Promise<Choice> {
                    const text = await Misc.GetTextFromElement(elem)
                    const val = await Misc.SetElemID(elem, ID_INPUT_SELECT_VALUES + i)
                    if (!text)
                        throw new Error("Pas réussi à récupérer les choix du select");
                    return { title: text, value: val }
                }))
        }
        let type: PromptTypes

        if (inputType as INPUT_TYPES == INPUT_TYPES.Search && choices !== undefined)
            type = PromptTypes.autocomplete
        else
            type = await this.GetPromptTypeFromInput(inputType)
        const shouldValidate = inputRquired && (inputType !== INPUT_TYPES.Radio && inputType !== INPUT_TYPES.Button && INPUT_TYPES.Unknown)
        return {
            message: text + ((inputRquired) ? TEXT_INPUT_REQUIRED : ''),
            name: name,
            type: type,
            choices: choices,
            validate: (shouldValidate) ? this.ValidateRequiredUserInput : undefined,
            suggest: (type === PromptTypes.autocomplete) ? this.SuggestSpaceSeparatedExactMatch : undefined
        }
    }

    static ValidateRequiredUserInput(value: string): boolean | string {
        return (value.length >= 3) ? true : TEXT_INPUT_INVALID
    }

    static async GetInputType(page: Page, inputSelector: string): Promise<INPUT_TYPES> {
        let input = await Misc.GetElemBySelector(page, inputSelector)
        if (!input)
            throw new Error("Pas réussi à trouver l'élément à partir du selecteur")
        return await input.evaluate(
            function (el: Element, types: [Selectors, INPUT_TYPES][], notFoundVal: INPUT_TYPES.Unknown): INPUT_TYPES {
                for (let type of types) {
                    let inputFound = el.querySelector(type[0])
                    console.log(type + ' ' + inputFound)
                    if (el.matches(type[0]) || inputFound !== null)
                        return type[1]
                }
                return notFoundVal
            }, SELECTORS_FOR_TYPES, INPUT_TYPES.Unknown)
    }


    static async GetLayoutType(page: Page): Promise<LAYOUT_TYPES> {
        if (await Misc.ElementExists(page, Selectors.TILE)) // /!\ Il faut vérifier si la page contient des tiles avant de vérifier si elle contient une form, car certaines form contiennent des tiles
            return LAYOUT_TYPES.Tiles

        //On attends maintenant que c'est nécessaire
        if (await Misc.ElementExists(page, Selectors.FORM))
            return LAYOUT_TYPES.Form

        console.log("Unknown layout type")
        return LAYOUT_TYPES.Unknown

    }

    static async GetTitleFromTile(el: ElementHandle<Element>): Promise<string | false> {
        return await Misc.GetTextFromElement(await el.$(Selectors.TILE_TITLE)) //N'utilise pas GetElemBySelector car il faut retourner un sous-élément de la variable el
    }

}