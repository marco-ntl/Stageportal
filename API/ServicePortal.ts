import { Console } from "console";
import { Browser, ElementHandle, HTTPResponse, Page } from "puppeteer"
import { isArray, isDeepStrictEqual } from "util";
import { resourceLimits } from "worker_threads";
import { InputType } from "zlib";
import { prompts } from ".."
import { IDictionary } from "../types/IModule";
import { Choice, Prompt, PromptOptions, PromptTypes } from "../types/prompt"
import { ComputerSearchResponse, Item } from "../types/ComputerSearchResponse";
import { Misc } from "./misc";
import { PersonSearchResponse } from "../types/PersonSearchResponse";
import { SoftwareSearchResponse } from "../types/SoftwareSearchResponse";
import { HomeTileIdentifiers } from "../const/HomeTileIdentifiers";
import DB, { Tables } from "./db";
import { Tile } from "../tables/Tile";
import { Text } from "../const/Text";
import { UNIQUE_IDS } from "../const/UniqueIDs";
import { URLs } from "../const/URLs";
import { Cookie } from "../types/Cookie";
import { PromptFields } from "../const/PromptFIelds";
import { SPInput } from "../types/SPInput";

enum API {
    HOME = '/EndUser/ServiceCatalog',
    CREATE_REQUEST = '/CreateRequest',
    GET_SEARCH_RESULTS = 'GetQueryResultData'
}



export enum Selectors {
    IS_LOADING = '.loading-center',
    TILE_TITLE = 'h1,h2,h3,h4,b', //Le titre d'une tile est toujours en gras
    HOME_TILE_TITLE = '.card-title.ro-title',
    TILE = '.card-service',
    FORM = '[name="requestForm"]', // /!\ Il faut vérifier si la page contient des tiles avant de vérifier si elle contient une form, car certaines form contiennent des tiles
    //MAIN_FORM_INPUT = 'textarea:visible, div.row.question input.form-control:visible, [type="radio"]:visible',
    MAIN_FORM_INPUT = '.active div.row.question', // data-fieldtype="System.SupportingItem.PortalControl.String" sont des "faux" inputs, qui servent uniquement à afficher des instructions à l'utilisateur
    MAIN_FORM_INPUT_TITLE = '.wrap-bl > span:first-of-type' /*'textarea, div.row.question input.form-control'*/,
    INPUT_SEARCH = '.selectCategoryInput',
    INPUT_SEARCH_VALUES = '.ui-grid-viewport .ui-grid-icon-singleselect',
    INPUT_SEARCH_SUBMIT_BTN = '.active .search-tbl',
    INPUT_SELECT = '.selectCategory input[readonly="readonly"]',
    INPUT_SELECT_VALUES = 'div li a',
    INPUT_TEXT = '[data-outname="String"]',
    INPUT_RADIO = '[type="radio"]',
    BUTTON_NEXT = '.active [ng-click="nextPage()"]',
    BUTTON_SUBMIT = '.active [ng-click="submitForm()"]',
    CLASS_INPUT_REQUIRED = '.required-field',
    POPUP_SR_NUMBER = ".modal-dialog a",
    POPUP_CLOSE_BUTTON = ".modal-dialog button",
    TILE_FOLD_ELEM = '.collapse-item-bl',
    TILE_FOLD_INNER_TITLE = '.heading-bl h4',
    TILE_FOLD_ELEM_CLOSED = '.collapse-item-bl.hidden-content',
    INNER_INPUT = 'input:not([type="hidden"]), textarea:not([type="hidden"])',
    SEARCH_SELECTED_VALUE = '.ui-grid-cell.ui-grid-row-selected'

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
    ComputerMainUser = "Utilisateur principal"
}

const TYPE_FOR_INPUT: [INPUT_TYPES, PromptTypes][] = [
    [INPUT_TYPES.Radio, PromptTypes.confirm],
    [INPUT_TYPES.Select, PromptTypes.autocomplete],
    [INPUT_TYPES.Search, PromptTypes.text],
    [INPUT_TYPES.Text, PromptTypes.text],
]

const SELECTORS_FOR_TYPES: [Selectors, INPUT_TYPES][] = [
    [Selectors.INPUT_RADIO, INPUT_TYPES.Radio],
    [Selectors.INPUT_SELECT, INPUT_TYPES.Select],
    [Selectors.INPUT_SEARCH, INPUT_TYPES.Search],
    [Selectors.INPUT_TEXT, INPUT_TYPES.Text],
]

//Permet de s'assurer que le site est bien en anglais, utile car les tiles sont reconnues par texte
const langCookie: Cookie = {
    name: "currentLanguageCode",
    value: "fr",
    domain: "serviceportal.srgssr.ch"
}


/**
 * Prend un type d'input ou type de prompt, et retourne le mapping [type d'input, type de prompt] correspondant
 *
 * @param {(INPUT_TYPES | PromptTypes)} value Valeur dont on veut la correspondance
 * @return {*}  {Promise<[INPUT_TYPES, PromptTypes]>} Le mapping
 */
async function GetInputToPromptMappingFromValue(value: INPUT_TYPES | PromptTypes): Promise<[INPUT_TYPES, PromptTypes]> {
    
    let typeTuple = TYPE_FOR_INPUT.find(Misc.GeneratePredicateFunc(value))
    if (!typeTuple || !Array.isArray(typeTuple) || typeTuple.length < 2)
        throw new Error("Pas trouvé de type de prompt pour l'input")

    return typeTuple
}

/**
 * Contient différentes fonctions aidant à interagir avec le serviceportal
 *
 * @export
 * @class ServicePortal
 */
export class ServicePortal {

    static PromptsTemplate = {
        SELECT_TILE: {
            type: PromptTypes.autocomplete,
            name: PromptFields.TILES,
            message: "(Premier lancement) - Indiquer la tuile correspondante",
            suggest: ServicePortal.SuggestFullTextSpaceSeparatedExactMatch //Recherche personnalisée via le paramètre suggest
        }
    };

    /**
     * Les paramètres
     *
     * @static
     * @memberof ServicePortal
     */
    static Settings = {
        SHOULD_SEARCH_RESULTS_HAVE_HEADERS: true,
        ASK_CONFIRMATION_BEFORE_SUBMITTING_SR: true,
        PROMPT_CONFIRM_SR: { name: PromptFields.CONFIRM_SUBMIT_SR, message: Text.CONFIRM_SUBMIT_SR, type: PromptTypes.confirm }
    }

    /**
     * Ouvre la HomePage du Service Portal
     *
     * @static
     * @param {(Page | Browser)} page La page à utiliser
     * @return {*}  {Promise<Page>} La page, sur la home page du service portal
     * @memberof ServicePortal
     */
    static async Open(page: Page | Browser): Promise<Page> {
        if (Misc.isBrowser(page))   //Si page est de type "Browser"
            page = await page.newPage();

        await page.setCookie(langCookie);
        if (!this.IsHomepage(page))
            await Misc.GotoAndWaitForSelector(page, URLs.SERVICE_PORTAL, Selectors.TILE)
        return page
    }

    /**
     * Retourne le type de prompt pour le type d'input spécifié
     *
     * @static
     * @param {INPUT_TYPES} inputType Le type d'input
     * @return {*}  {Promise<PromptTypes>} Le type de prompt
     * @memberof ServicePortal
     */
    static async GetPromptTypeFromInputType(inputType: INPUT_TYPES): Promise<PromptTypes> {
        return (await GetInputToPromptMappingFromValue(inputType))[1]
    }

    /**
     * Retourne le type d'input pour le type de prompt spécifié
     *
     * @static
     * @param {INPUT_TYPES} promptType Le type de prompt
     * @return {*}  {Promise<INPUT_TYPES>} Le type d'input
     * @memberof ServicePortal
     */
    static async GetInputTypeFromPromptType(promptType: PromptTypes): Promise<INPUT_TYPES> {
        return (await GetInputToPromptMappingFromValue(promptType))[0]
    }

    /**
     * Retourne True si la page est sur la home page du ServicePortal
     *
     * @static
     * @param {Page} page
     * @return {*}  {boolean} Est-ce que la page est sur la home page ?
     * @memberof ServicePortal
     */
    static IsHomepage(page: Page): boolean {
        return page.url().includes(URLs.SERVICE_PORTAL_HOME_PAGE);
    }

    /**
     * Retourne un tableau contenant toutes les tuiles de la page actuelle
     *
     * @static
     * @param {Page} page
     * @return {*}  {(Promise<ElementHandle<Element>[] | false>)} Tableau de tuiles
     * @memberof ServicePortal
     */
    static async GetAllTiles(page: Page): Promise<ElementHandle<Element>[] | false> {
        await ServicePortal.UnfoldAllTiles(page)
        return await Misc.GetMultipleElemsBySelector(page, Selectors.TILE)
    }

    /**
     * Retourne tous les inputs de la page actuelle
     *
     * @static
     * @param {Page} page
     * @return {*}  {(Promise<ElementHandle<Element>[] | false>)} Tableau d'inputs
     * @memberof ServicePortal
     */
    static async GetFormInputs(page: Page): Promise<ElementHandle<Element>[] | false> {
        return await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT);
    }

    /**
     * Récupère tous les inputs de la page, et retourne celui à l'index correspondant
     *
     * @static
     * @param {Page} page
     * @param {number} index L'index de l'input voulu
     * @return {*}  {(Promise<ElementHandle | false>)} L'input à l'index désiré
     * @memberof ServicePortal
     */
    static async GetFormInput(page: Page, index: number): Promise<ElementHandle | false> {
        const tmp = await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT);
        if (!tmp)
            return false

        if (index >= tmp.length)
            return false

        return tmp[index]
    }

    /*static async GetFormTitles(page: Page): Promise<(string | false)[]> {
        let elems = await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT_TITLE);
        if (!elems)
            return [false]
        return await Promise.all(elems.map(async el => await Misc.GetTextFromElement(el)))
    }*/

    /**
     * Retourne le titre d'un bloc d'input
     *
     * @static
     * @param {ElementHandle} input L'input (Le bloc, pas l'innerInput)
     * @return {*}  {(Promise<false|string>)} Le titre du bloc
     * @memberof ServicePortal
     */
    static async GetTitleFromInput(input:ElementHandle):Promise<false|string>{
        const titleElem = await input.$(Selectors.MAIN_FORM_INPUT_TITLE)
        if(!titleElem)
            return false
        return await Misc.GetTextFromElement(titleElem)
    }

    /*
    static async GetInputTitle(page: Page, index: false | number = false): Promise<string | false> {
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
    }*/

    /**
     * Retourne les éléments qui matchent le selecteur indiqué
     *
     * @static
     * @param {Page} page La page sur laquelle effectuer la recherche
     * @param {string} selector Le selecteur auquel matcher les éléments
     * @param {(false | number)} [index=false] Si index est défini, seul l'élément à l'index indiqué sera retourné
     * @return {*}  {(Promise<ElementHandle<Element>[] | false>)} L'élément
     * @memberof ServicePortal
     */
    static async GetMatchingElements(page: Page, selector: string, index: false | number = false): Promise<ElementHandle<Element>[] | false> {

        let result = await Misc.GetMultipleElemsBySelector(page, selector)
        if (!result || result.length <= 0)
            return false

        if (index)
            return [result[index]]
        return result
    }

    /**
     * Ouvre tous les menus pliants sur la page
     *
     * @static
     * @param {Page} page
     * @memberof ServicePortal
     */
    static async UnfoldAllTiles(page: Page) {
        let headers = await Misc.GetMultipleElemsBySelector(page, Selectors.TILE_FOLD_ELEM_CLOSED)
        if (!headers)
            return //Pas d'erreur, certaines pages contiennent des tiles mais pas d'header (eg. windows store)
        let i = 0
        for (let header of headers) {
            const id = await Misc.SetElemID(header, UNIQUE_IDS.FOLD_HEADER + i)
            await Misc.ClickOnElem(page, id)
            i++
        }
    }

    /**
     * Parse une réponse HTTP, et retourne différentes valeurs selon celle-ci
     *
     * @static
     * @param {HTTPResponse} response La réponse à parser
     * @return {*}  {(Promise<string[][] | boolean>)} True si un seul élément a été trouvé;False si aucun résultats;Un tableau contenant un tableau par ligne de réponse si NbReponse > 1 
     * @memberof ServicePortal
     */
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
                if (ServicePortal.Settings.SHOULD_SEARCH_RESULTS_HAVE_HEADERS)
                    result = [[RESPONSE_HEADERS.Name, RESPONSE_HEADERS.Status, RESPONSE_HEADERS.Region, RESPONSE_HEADERS.ComputerMainUser]]
                for (let item of parsedResponse.Items) {
                    result.push([item?.DisplayName?.Value, item?.Status?.Value, item?.Region?.Value, item?.HardwareAssetIsUsedByPerson?.UserPrincipalName?.Value])
                }
            }
            else if ("UserPrincipalName" in rawResponse.Items[0]) {
                parsedResponse = rawResponse as PersonSearchResponse
                if (ServicePortal.Settings.SHOULD_SEARCH_RESULTS_HAVE_HEADERS)
                    result = [[RESPONSE_HEADERS.Name, RESPONSE_HEADERS.LogonName]]
                for (let item of parsedResponse.Items) {
                    result.push([item?.DisplayName?.Value, item?.UserLogonName?.Value])
                }
            }
            else if ("Version" in rawResponse.Items[0]) {
                let price
                parsedResponse = rawResponse as SoftwareSearchResponse
                if (ServicePortal.Settings.SHOULD_SEARCH_RESULTS_HAVE_HEADERS)
                    result = [[RESPONSE_HEADERS.Name, RESPONSE_HEADERS.Version, RESPONSE_HEADERS.Platform, RESPONSE_HEADERS.Region, RESPONSE_HEADERS.Price]]

                for (let item of parsedResponse.Items) {
                    if (item?.ConfigItemHasPrice?.Price1Amount?.Value)
                        price = item.ConfigItemHasPrice.Price1Amount.Value
                    else
                        price = 0
                    result.push([item?.DisplayName?.Value, item?.Version?.Value, item?.Platform?.Value, item?.Region?.Value, price?.toString()])
                }
                result = result.map(x => x.map(str => (!str) ? 'NONE' : str)) //On remplace les champs vides par "NONE"
            } else
                throw new Error("Unexpected response type from search")
            return result.map(x => x.map(str => (!str) ? 'NONE' : str)) //On remplace les champs vides par "NONE"
        }
    }

    /**
     * Remplit un input de recherche avec la valeur indiquée, et retourne le résultat de la recherche parsé par ParseSearchResponse
     *
     * @static
     * @param {Page} page
     * @param {SPInput} input L'input à remplir
     * @param {string} searchBtnID L'ID du bouton de recherche
     * @param {string} value La valeur à rechercher
     * @return {*}  {(Promise<boolean | string[][]>)} Le résultat de la recherche, parsé par ParseSearchResponse
     * @memberof ServicePortal
     */
    static async FillSearchInputAndParseResults(page: Page, input:SPInput, value: string, searchBtnID: string): Promise<boolean | string[][]> {
        await Misc.FocusElemAndType(page, input.innerInput.id, value)
        await Misc.ClickOnElem(page, searchBtnID)
        const networkResponse = await page.waitForResponse(response => response.url().includes(API.GET_SEARCH_RESULTS))
        return await this.ParseSearchResponse(networkResponse)
    }

    /**
     * Set l'input à la valeur indiquée
     *
     * @static
     * @param {Page} page
     * @param {SPInput} input L'input à setter
     * @param {(boolean | string)} value La valeur à donner à l'input
     * @return {*}  {(Promise<boolean | string[][]>)}  Booléen -> Est-ce que l'input a bien été set;String[][] -> La liste de résultats de recherche
     * @memberof ServicePortal
     */
    static async SetInputValue(page:Page, input:SPInput, value: boolean | string): Promise<boolean | string[][]> {
        switch (input.type) {

            case INPUT_TYPES.Radio: //Valeur -> Booléen
                if (typeof value !== "boolean")
                    throw new TypeError("Résultat du prompt inattendu. \"Booléen\" attendu.")
                if (!input.secondInnerInput)
                    throw new Error("Il manque une valeur pour le Radio input")
                if (value)
                    Misc.ClickOnElem(page, input.innerInput.id)
                else
                    Misc.ClickOnElem(page, input.secondInnerInput.id)
                return true

            case INPUT_TYPES.Select: //Valeur -> Sélecteur de la valeur désirée
                if (typeof value !== "string")
                    throw new TypeError("Résultat du prompt inattendu. \"String\" attendu.")
                const elem = await Misc.GetElemBySelector(page, value)
                if (!elem)
                    throw new Error("Pas trouvé de valeur d'input correspondant au sélecteur " + value)
                await Misc.ClickOnElem(page, value)
                return true

            case INPUT_TYPES.Text: //Valeur -> Texte à tapper
                if (typeof value !== "string")
                    throw new Error("Résultat du prompt inattendu. \"String\" attendu.")
                await Misc.FocusElemAndType(page, input.innerInput.id, value)
                return true

            case INPUT_TYPES.Search:
                const searchBtnID = await Misc.SetElemID(await this.GetSearchBtn(input), input.inputBlock.id + UNIQUE_IDS.SEARCH_BTN)
                if (typeof value !== "string")
                    throw new Error("Résultat du prompt inattendu. \"String\" attendu.")
                if (!searchBtnID)
                    throw new Error("Pas trouvé le bouton de recherche")

                return await this.FillSearchInputAndParseResults(page, input, value,searchBtnID)

            case INPUT_TYPES.Unknown:
            default:
                console.log("Unknown input")
                return false
        }
    }

    /**
     * Retourne true si l'input spécifié est requis
     *
     * @static
     * @param {ElementHandle} input L'input à checker (bloc input et pas inner input)
     * @return {*}  {Promise<boolean>} Est-ce que l'input est requis ?
     * @memberof ServicePortal
     */
    static async IsInputRequired(input:ElementHandle): Promise<boolean> {
        return (await input.$(Selectors.CLASS_INPUT_REQUIRED)) !== null
    }

    /**
     * Retourne true si l'input est un input de recherche avec une valeur définie
     * 
     *
     * @static
     * @param {SPInput} input L'input à checker
     * @return {*}  {Promise<boolean>} Est-ce que l'input est 
     * @memberof ServicePortal 
     */
    static async IsValidSearch(input: SPInput): Promise<boolean> //Certains input de recherche (eg. "Operating System Build" dans stock device) ont déjà une valeur séléctionnée
    {
        const SelectedValue = await input.inputBlock.elem.$(Selectors.SEARCH_SELECTED_VALUE)
        return (SelectedValue !== null)
    }

    /**
     * Retourne le bouton de recherche d'un input recherche
     *
     * @static
     * @param {SPInput} input L'input
     * @return {Promise<ElementHandle>} Le bouton de recherche
     * @memberof ServicePortal
     */
    static async GetSearchBtn(input: SPInput):Promise<ElementHandle> {
        const searchBtn = await input.inputBlock.elem.$(Selectors.INPUT_SEARCH_SUBMIT_BTN)
        if (!searchBtn)
            throw new Error("Pas trouvé le bouton de recherche")
        return searchBtn
    }

    /**
     * Donne la valeur spécifiée à l'input spécifié
     *
     * @static
     * @param {Page} page
     * @param {SPInput} input L'input à remplir
     * @param {(string | boolean)} value La valeur à donner à l'input
     * @return {*}  {(Promise<boolean | string>)} La valeur de l'input
     * @memberof ServicePortal
     */
    static async FillInput(page: Page, input:SPInput, value: string | boolean): Promise<boolean | string>{
        let response = await this.SetInputValue(page, input, value)
        if (input.type === INPUT_TYPES.Search) {
            if (response === false) {
                console.log("Aucun résultats")
                await Misc.ClearTextbox(page, input.innerInput.id)
                return await ServicePortal.FillInput(page, input, await ServicePortal.AskValueFromUser(input)) //Si pas de résultats, on redemande à l'utilisateur puis on recommence
            }
            //Si l'utilisateur a fait une recherche et il y a plus d'un résultat 
            if (Array.isArray(response)) {
                value = await this.HandleSearchResults(page, input, response)
            }
        }
        return value
    }

    /**
     * Demande à l'utilisateur la valeur qu'il faudrait donner à l'input spécifié
     *
     * @static
     * @param {SPInput} input
     * @return {*}  {(Promise<string | boolean | 'canceled'>)} La valeur séléctionnée par l'utilisateur ou 'canceled' si annulé
     * @memberof ServicePortal
     */
    static async AskValueFromUser(input:SPInput):Promise<string | boolean | 'canceled'>{
        let canceled = false
        const options: PromptOptions = { onCancel: () => canceled = true }

        if (input.type === INPUT_TYPES.Select)
            await this.CreateChoicesFromSelect(input) //NÉCÉSSAIRE; La fonction donne des IDs uniques aux choix du select

        const prompt = await ServicePortal.CreatePromptFromInput(input, 'TMP')
        const value = (await prompts(prompt, options))['TMP'] as string | boolean
        if (canceled)
            return 'canceled'
        return value
    }


    /**
     * Remplit la form sur la page actuelle. Les valeurs non définies seront demandées à l'utilisateur
     *
     * @static
     * @param {Page} page
     * @param {number} stepNumber L'étape actuelle dans la form (Une étape = tous les inputs jusqu'à 'étape suivante')
     * @param {number} [startIndex=0] L'index à partir duquel commencer à remplir les inputs
     * @param {boolean} [fillOnlyOneInput=false] Est-ce que l'on doit remplir un seul input ?
     * @param {(undefined | any | any[])} [values=undefined] Les valeurs à donner aux inputs. Si incomplet, les valeurs manquantes seront demandées à l'utilisateur
     * @return {*}  {(Promise<false | {values:(string | boolean)[],nextIndex:number}>)} Les valeurs des inputs et l'index du prochain input
     * @memberof ServicePortal
     */
    static async FillForm(page: Page, stepNumber: number, startIndex: number = 0, fillOnlyOneInput = false, values: undefined | any | any[] = undefined): Promise<false | {values:(string | boolean)[],nextIndex:number}> { //Si fillOneInput = true, on set seulement l'input à startingIndex
        let inputIndex = startIndex,
            validInputIndex = 0,
            rawInput:ElementHandle | false,
            input: SPInput | false,
            promptAnswer,
            answers = [],
            tmpVal = undefined
        const STEP_ID = UNIQUE_IDS.STEP + stepNumber

        if (values && !Array.isArray(values))
            values = [values]
        await Misc.sleep(1000) //@TODO trouver quelque chose de plus solide. Nécessaire car certaines forms (eg assign) chargent d'abord une étape "get user"
        while (rawInput = (await ServicePortal.GetFormInput(page, inputIndex))) { // GetFormInputs retourne False quand aucun élément n'est trouvé. L'évaluation d'une assignation en JS retourne la valeur assignée
            input = await SPInput.new(rawInput, STEP_ID + UNIQUE_IDS.INPUT + inputIndex)
            if (!input || await this.IsValidSearch(input)) { //@TODO Trouver quelque chose de plus solide ? (nécessaire???). Les inputs "Search" qui commencent avec une valeur présélectionnée devraient généralement être remplacés par des selects
                inputIndex++
                continue;
            }

            if (!values || !values[validInputIndex])
                tmpVal = await ServicePortal.AskValueFromUser(input)
            else
                tmpVal = values[validInputIndex]
            if(tmpVal === 'canceled')
                return false //@TODO handle this better ?
            promptAnswer = await this.FillInput(page, input, tmpVal)

            if(validInputIndex === 0 && stepNumber === 0){
                //await Misc.waitForNetworkIdle(page, 10000, 1500, 500, 2)
                //await Misc.waitForNetworkIdle(page)
                await Misc.sleep(350) //@MALDETETE rien d'autre fonctionne @TODO plus solide????))
            }

            answers.push(promptAnswer)

            inputIndex++ //On incrémente avant un potentiel retour, car on veut retourner l'index de l'élément suivant
            validInputIndex++

            if (fillOnlyOneInput)
                return {values:answers,nextIndex:inputIndex}

        }
        return {values:answers,nextIndex:inputIndex}

    }

    
    /**
     * Prend une liste de réponse de recherches, et demande à l'utilisateur de séléctionner la réponse désirée
     *
     * @static
     * @param {Page} page
     * @param {SPInput} input L'input de recherche
     * @param {string[][]} response La liste de résultats
     * @return {*}  {Promise<string>} L'ID de la réponse séléctionnée
     * @memberof ServicePortal
     */
    static async HandleSearchResults(page: Page, input:SPInput, response: string[][]): Promise<string> {
        let choices: Choice[] = []
        const lines = Misc.FormatStringRows(response)
        for (let i = 0; i < response.length; i++)
            choices.push({ title: lines[i], value: i })

        const prompt = await ServicePortal.CreatePromptFromInput(input, 'TMP',"Résultats de la recherche :", choices)
        let answerIndex = (await prompts(prompt))['TMP']
        const searchResults = await input.inputBlock.elem.$$(Selectors.INPUT_SEARCH_VALUES)
        if (!searchResults || searchResults.length < answerIndex)
            throw new Error("Failed to select search values")
        if (ServicePortal.Settings.SHOULD_SEARCH_RESULTS_HAVE_HEADERS) {
            if (answerIndex === 0)
                throw new Error("Merci de ne pas sélectionner les en-têtes des résultats de recherche")
            else
                answerIndex = parseInt(answerIndex) - 1
        }
        const answerID = await Misc.SetElemID(searchResults[answerIndex], input.inputBlock.id + UNIQUE_IDS.SELECTED_VALUE)
        await Misc.ClickOnElem(page, answerID)
        return answerID
    }

    /**
     * Clique sur le bouton "Submit" et retourne le numéro de la SR
     * Si Settings.ASK_CONFIRMATION_BEFORE_SUBMITTING_SR === true, l'utilisateur doit confirmer avant de submit
     *
     * @static
     * @param {Page} page
     * @param {string} elemSelector Le sélécteur du bouton "Submit"
     * @return {*}  {(Promise<string | false>)}
     * @memberof ServicePortal
     */
    static async SubmitAndGetSR(page: Page, elemSelector: string): Promise<string | false> {
        if (ServicePortal.Settings.ASK_CONFIRMATION_BEFORE_SUBMITTING_SR) {
            let submit: boolean = (await prompts(ServicePortal.Settings.PROMPT_CONFIRM_SR))[PromptFields.CONFIRM_SUBMIT_SR]
            if (!submit) {
                await ServicePortal.Open(page)
                return false
            }
        }

        await Misc.ClickAndWaitForSelector(page, elemSelector, Selectors.POPUP_CLOSE_BUTTON)

        const srElem = await Misc.GetElemBySelector(page, Selectors.POPUP_SR_NUMBER)
        if (!srElem)
            throw new Error("Couldn't find SR number")

        const closeBtn = Misc.GetElemBySelector(page, Selectors.POPUP_CLOSE_BUTTON)
        if (!closeBtn)
            throw new Error("Couldn't find the button to close the new SR popup")
        await Misc.sleep(50) //Le textContent de srElem est set légerement après la création de celui-ci. Il faut attendre un peu avant de pouvoir récupérer celui-ci :)
        const num = await Misc.GetTextFromElement(srElem)
        if (!num)
            throw new Error("Couldn't get number from modal element")
        await ServicePortal.Open(page)
        return num
    }

    /**
     * Passe à l'étape suivante de la form, ou submit et retourne la SR si la form est à la dernière étape
     *
     * @static
     * @param {Page} page
     * @param {number} stepNumber Le numéro de l'étape actuelle; Nécessaire pour set une ID unique et répétable au bouton
     * @return {*}  {(Promise<boolean | string>)} Retourne True si passé à l'étape suivante; Retourne le numéro de la SR si dernière étape
     * @memberof ServicePortal
     */
    static async GoToFormNextStep(page: Page, stepNumber: number): Promise<boolean | string> {
        const nextStepBtn = await page.$(Selectors.BUTTON_NEXT)
        const STEP_ID = UNIQUE_IDS.STEP + stepNumber
        if (nextStepBtn) {
            const currID = await Misc.SetElemID(nextStepBtn, STEP_ID + UNIQUE_IDS.CURRENT_NEXT_STEP_BTN)
            const notCurrentID = ':not(' + currID + ')'
            await Misc.ClickAndWaitForSelector(page, currID, `${Selectors.BUTTON_NEXT + notCurrentID}, ${Selectors.BUTTON_SUBMIT + notCurrentID}`) //On clique sur le bouton "next step", puis on attends que le prochain bouton (next ou submit) charge (waitForNavigation NOK car l'application est en Single-Page)
            return true
        }
        const submitBtn = await Misc.GetElemBySelector(page, Selectors.BUTTON_SUBMIT)
        if (!submitBtn)
            return false
        const currID = await Misc.SetElemID(submitBtn, STEP_ID + UNIQUE_IDS.CURRENT_SUBMIT_BTN)
        return await this.SubmitAndGetSR(page, currID)
    }

    /**
     * Retourne un tableau de Choices créé à partir des Tiles spécifiées. Le texte est égal au titre de la tile; la valeur est égale à l'ID de celle-ci
     *
     * @static
     * @param {Page} page
     * @param {ElementHandle<Element>[]} tiles La liste de tiles à partir desquelles créer les Choices
     * @return {*}  {Promise<Choice[]>} La liste de choix; Le texte est égal au titre de la tile; la valeur est égale à l'ID de celle-ci
     * @memberof ServicePortal
     */
    static async GetChoicesFromTiles(page: Page, tiles: ElementHandle<Element>[]): Promise<Choice[]> {
        const result: Choice[] = [];
        let tileText: TileTextInfo | false,
            i = 0,
            shouldSetIDs = !(await Misc.ElementExists(page, `#${UNIQUE_IDS.TILE}0`)), //Évite d'avoir à communiquer avec la page lorsque pas nécessaire
            currTileID: string

        for (let tile of tiles) {
            currTileID = UNIQUE_IDS.TILE + i
            if (shouldSetIDs)
                currTileID = await Misc.SetElemID(tile, currTileID)
            else
                currTileID = '#' + currTileID
            tileText = await ServicePortal.GetTitleAndCategoryFromTile(page, currTileID);
            if (!tileText)
                throw new Error("Can't get title from tile")

            result.push({ title: tileText.name, value: currTileID, description: tileText.category });
            i++
        }
        return result;
    }

    /**
     * Prends un texte à rechercher, le split sur les espaces afin d'obtenir une liste de keywords.
     * Retourne tous les choice dont le titre ou la description contient tous les keywords
     *
     * @static
     * @param {string} input
     * @param {Choice[]} choices
     * @return {*}  {Promise<Choice[]>}
     * @memberof ServicePortal
     */
    static async SuggestFullTextSpaceSeparatedExactMatch(input: string, choices: Choice[]): Promise<Choice[]> { //Split input à chaque espace, et retourne les éléments qui contiennent chacun des mots obtenus ainsi
        return await choices.filter(elem => Misc.IncludesAll(`${elem.title} ${elem?.description}`, input.split(' ')))
    }

    /**
     * Retourne les éléments HTML des valeurs d'un input Select
     *
     * @static
     * @param {SPInput} input L'input Select
     * @return {*}  {Promise<ElementHandle[]>} La liste des valeurs
     * @memberof ServicePortal
     */
    static async GetValuesElementsFromSelectInput(input: SPInput): Promise<ElementHandle[]> {
        const valuesList = await input.inputBlock.elem.$$(input.innerInput.id + ' + ' + Selectors.INPUT_SELECT_VALUES) //Le sélecteur + séléctionne les siblings
        if (!valuesList || valuesList.length <= 0)
            throw new Error("Pas réussi à récupérer les values du select " + input)
        return valuesList
    }

    /**
     * Créer une liste de Choice à partir d'un Select
     *
     * @static
     * @param {SPInput} input Le select
     * @return {*}  {Promise<Choice[]>} La liste de choix ; La valeur correspond à l'ID de la réponse
     * @memberof ServicePortal
     */
    static async CreateChoicesFromSelect(input: SPInput): Promise<Choice[]> {
        const elems = await this.GetValuesElementsFromSelectInput(input)
        if (!elems)
            throw new Error("Pas trouvé les valeurs du select " + input)
        return await Promise.all(elems.map(
            async function (elem: ElementHandle, i: number): Promise<Choice> {
                const elemID = await Misc.SetElemID(elem, input.inputBlock.id.slice(1) + UNIQUE_IDS.INPUT_SELECT_VALUES + i) //On enlève le '#' du sélecteur parent. Il est important de garder la hiérarchie entière, pour éviter d'avoir des ID en doubles
                const text = await Misc.GetTextFromElement(elem)
                if (!text)
                    throw new Error("Pas réussi à récupérer les choix du select");
                return { title: text, value: elemID }
            }))
    }

    /**
     * Créé un prompt à partir d'un input
     *
     * @static
     * @param {SPInput} input L'input
     * @param {string} name Le nom à donner au prompt
     * @param {string} [text] Le texte du prompt; Si null le texte sera le titre de l'input
     * @param {Choice[]} [choices] La liste de choix, à définir si nécessaire
     * @return {*}  {Promise<Prompt>}
     * @memberof ServicePortal
     */
    static async CreatePromptFromInput(input:SPInput, name: string, text?:string, choices?: Choice[]): Promise<Prompt> {
        if (input.type === INPUT_TYPES.Select)
            choices = await this.CreateChoicesFromSelect(input)

        let type: PromptTypes

        if (input.type === INPUT_TYPES.Search && choices !== undefined)
            type = PromptTypes.autocomplete
        else
            type = await this.GetPromptTypeFromInputType(input.type)

        const shouldValidate = input.required && (input.type !== INPUT_TYPES.Radio && input.type !== INPUT_TYPES.Button && INPUT_TYPES.Unknown)
        return {
            message: input.title + ((input.required) ? Text.INPUT_REQUIRED : ''),
            name: name,
            type: type,
            choices: choices,
            validate: (shouldValidate) ? this.ValidateLongerThan3Chars : undefined,
            suggest: (type === PromptTypes.autocomplete) ? this.SuggestFullTextSpaceSeparatedExactMatch : undefined
        }
    }

    /**
     * Retourne true si le texte fait plus de 3 charactères, sinon retourne Text.INPUT_INVALID
     * Utilisé pour valider automatiquement certains prompts
     *
     * @static
     * @param {string} value
     * @return {*}  {(boolean | string)}
     * @memberof ServicePortal
     */
    static ValidateLongerThan3Chars(value: string): boolean | string {
        return (value.length >= 3) ? true : Text.INPUT_INVALID
    }

    /**
     * Retourne le type d'un input
     *
     * @static
     * @param {ElementHandle} input Le bloc de l'input
     * @return {*}  {Promise<INPUT_TYPES>} Le type d'input
     * @memberof ServicePortal
     */
    static async GetInputType(input: ElementHandle): Promise<INPUT_TYPES> {
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


    /**
     * Retourne le type de layout d'une page spécifiée
     *
     * @static
     * @param {Page} page
     * @return {*}  {Promise<LAYOUT_TYPES>} Le type de layout
     * @memberof ServicePortal
     */
    static async GetLayoutType(page: Page): Promise<LAYOUT_TYPES> {
        if (await Misc.ElementExists(page, Selectors.TILE)) // /!\ Il faut vérifier si la page contient des tiles avant de vérifier si elle contient une form, car certaines forms contiennent des tiles
            return LAYOUT_TYPES.Tiles

        if (await Misc.ElementExists(page, Selectors.FORM))
            return LAYOUT_TYPES.Form

        console.log("Unknown layout type")
        return LAYOUT_TYPES.Unknown

    }

    /**
     * Retourne le titre d'une tuile
     *
     * @static
     * @param {Page} page
     * @param {string} selector Le selecteur permettant de matcher la tuile
     * @return {*}  {Promise<string>} Le titre de la tuile
     * @memberof ServicePortal
     */
    static async GetTitleFromTile(page: Page, selector: string): Promise<string> {
        const tile = await Misc.GetElemBySelector(page, selector)
        if (!tile)
            throw new Error("Failed to get Tile")
        const tileTitle = await tile.$(Selectors.TILE_TITLE)
        if (!tileTitle)
            throw new Error("Failed to get Tile title element")
        const result = await Misc.GetTextFromElement(tileTitle)//N'utilise pas GetElemBySelector car il faut retourner un sous-élément de la variable el
        if (!result)
            throw new Error("Failed to get title from Tile")
        return result
    }

    /**
     * Retourne la catégorie de la tile matchant le sélecteur spécifié. La catégorie correspont au texte du menu pliant
     *
     * @static
     * @param {Page} page
     * @param {string} selector Le sélecteur de la tuile
     * @return {*}  {(Promise<string | undefined>)} La catégorie
     * @memberof ServicePortal
     */
    static async GetCategoryFromTile(page: Page, selector: string): Promise<string | undefined> {
        return await Misc.GetMatchingParentText(page, selector, Selectors.TILE_FOLD_ELEM, Selectors.TILE_FOLD_INNER_TITLE)
    }

    /**
     * Retourne le titre et la catégorie d'une tuile
     *
     * @static
     * @param {Page} page
     * @param {string} elSelector Le sélecteur de la tuile
     * @return {*}  {Promise<TileTextInfo>} Le titre et la catégorie de la tuile spécifiée
     * @memberof ServicePortal
     */
    static async GetTitleAndCategoryFromTile(page: Page, elSelector: string): Promise<TileTextInfo> {
        return { name: await ServicePortal.GetTitleFromTile(page, elSelector), category: await ServicePortal.GetCategoryFromTile(page, elSelector) }
    }

    /**
     * Récupère le GUID de la tuile spécifiée, et ouvre celle-ci.
     * Si le GUID n'est pas trouvé, demande à l'utilisateur de séléctionner la tuile, puis sauvegarde la GUID en base de donnée avant d'ouvrir celle-ci
     *
     * @static
     * @param {Page} page
     * @param {HomeTileIdentifiers} tile La tuile à ouvrir
     * @return {*}  {Promise<void>}
     * @memberof ServicePortal
     */
    static async OpenHomeTile(page: Page, tile: HomeTileIdentifiers): Promise<void> {
        if (!(await DB.TableExists(Tables.Tiles)))
            await DB.CreateTilesTable()
        let tileInfo = await DB.GetTileByIdentifier(tile)
        if (!tileInfo) {  //Si la tile n'existe pas -> on demande à l'utilisateur de la sélectionner. SOLIDE))))
            if (!ServicePortal.IsHomepage(page))
                await ServicePortal.Open(page)

            let tiles = await ServicePortal.GetAllTiles(page)
            if (!tiles)
                throw new Error("Pas réussi à récupérer les tiles");

            (ServicePortal.PromptsTemplate.SELECT_TILE as Prompt).choices = await ServicePortal.GetChoicesFromTiles(page, tiles)
            const userChoice: string = (await prompts(ServicePortal.PromptsTemplate.SELECT_TILE))[PromptFields.TILES]

            tileInfo = { Guid: await this.GetTileGUIDBySelector(page, userChoice), Identifier: tile }
            DB.InsertTile(tileInfo)
        }
        await this.OpenTileByGUID(page, tileInfo.Guid)
    }

    /**
     * Retourne le GUID de la tuile correspondant au sélécteur spécifié
     *
     * @static
     * @param {Page} page
     * @param {string} selector Le sélécteur de la tuile
     * @return {Promise<string>} Le GUID de la tuile
     * @memberof ServicePortal
     */
    static async GetTileGUIDBySelector(page: Page, selector: string):Promise<string> {
        const elem = await Misc.GetElemBySelector(page, selector)
        if (!elem)
            throw new Error("Pas réussi à trouver la tile " + selector)
        let groups = (await (await elem.getProperty('href')).jsonValue() as string).match(Regexes.TILE_GUID)
        if (!groups || groups.length == 1) //string.match retourne le string si celui a matché à l'index 0, puis chaque groupe dans les index suivants
            throw new Error("Pas réussi à récupérer le GUID de la tuile " + selector)
        return groups[1]
    }

    /**
     * Ouvre la tuile avec le GUID indiqué
     *
     * @static
     * @param {Page} page
     * @param {(string | Tile)} guid Le guid, ou un objet Tile
     * @memberof ServicePortal
     */
    static async OpenTileByGUID(page: Page, guid: string | Tile) {
        if (typeof guid !== "string")
            guid = guid.Guid

        await Misc.GotoAndWaitForNetworkIdle(page, URLs.SERVICEPORTAL_CREATE_REQUEST + guid)
    }

}
const Regexes = {
    TILE_GUID: /CreateRequest\/(.*)\?/
}
export type TileTextInfo = {
    name: string,
    category?: string
}

