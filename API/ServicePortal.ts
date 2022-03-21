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
import { CUSTOM_IDs } from "../const/CustomIds";
import { URLs } from "../const/URLs";
import { Cookie } from "../types/Cookie";
import { PromptFields } from "../const/PromptFIelds";

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
    MAIN_FORM_INPUT_TITLE = '.active div.row.question .wrap-bl > span:first-of-type' /*'textarea, div.row.question input.form-control'*/,
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

/*interface INPUT_SEARCH {
    itx-searchbox:string;
}*/
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

    static PromptsTemplate = {
        SELECT_TILE: {
            type: PromptTypes.autocomplete,
            name: PromptFields.TILES,
            message: "(Premier lancement) - Indiquer la tuile correspondante",
            suggest: ServicePortal.SuggestFullTextSpaceSeparatedExactMatch //Recherche personnalisée via le paramètre suggest
        }
    };

    static Settings = {
        SHOULD_SEARCH_RESULTS_HAVE_HEADERS: true,
        ASK_CONFIRMATION_BEFORE_SUBMITTING_SR: true,
        PROMPT_CONFIRM_SR: { name: PromptFields.CONFIRM_SUBMIT_SR, message: Text.CONFIRM_SUBMIT_SR, type: PromptTypes.confirm }
    }

    static async Open(page: Page | Browser): Promise<Page> {
        if (isBrowser(page))   //Si page est de type "Browser"
            page = await page.newPage();

        await page.setCookie(langCookie);
        if (!this.IsHomepage(page))
            await Misc.GotoAndWaitForSelector(page, URLs.SERVICE_PORTAL, Selectors.TILE)
        return page
    }

    static async GetPromptTypeFromInputType(inputType: INPUT_TYPES): Promise<PromptTypes> {
        return (await GetInputToPromptMappingFromValue(inputType))[1]
    }

    static async GetInputTypeFromPromptType(promptType: PromptTypes): Promise<INPUT_TYPES> {
        return (await GetInputToPromptMappingFromValue(promptType))[0]
    }

    static IsHomepage(page: Page): boolean {
        return page.url().includes(URLs.SERVICE_PORTAL_HOME_PAGE);
    }

    static async GetAllTiles(page: Page): Promise<ElementHandle<Element>[] | false> {
        await ServicePortal.UnfoldAllTiles(page)
        return await Misc.GetMultipleElemsBySelector(page, Selectors.TILE)
    }

    static async GetFormInputs(page: Page): Promise<ElementHandle<Element>[] | false> {
        return await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT);
    }

    static async GetFormInput(page: Page, index: number): Promise<ElementHandle<Element> | false> {
        const tmp = await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT);
        if (!tmp)
            return false

        if (index >= tmp.length)
            return false

        return tmp[index]
    }

    static async GetFormTitles(page: Page): Promise<(string | false)[]> {
        let elems = await this.GetMatchingElements(page, Selectors.MAIN_FORM_INPUT_TITLE);
        if (!elems)
            return [false]
        return await Promise.all(elems.map(async el => await Misc.GetTextFromElement(el)))
    }

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
        let headers = await Misc.GetMultipleElemsBySelector(page, Selectors.TILE_FOLD_ELEM_CLOSED)
        if (!headers)
            return //Pas d'erreur, certaines pages contiennent des tiles mais pas d'header (eg. windows store)
        let i = 0
        for (let header of headers) {
            const id = await Misc.SetElemID(header, CUSTOM_IDs.FOLD_HEADER + i)
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

    static async FillSearchInputAndGetResults(page: Page, inputSelector: string, searchBtnID: string, value: string): Promise<boolean | string[][]> {
        await Misc.FocusElemAndType(page, inputSelector, value)
        await Misc.ClickOnElem(page, searchBtnID)
        const networkResponse = await page.waitForResponse(response => response.url().includes(API.GET_SEARCH_RESULTS))
        return await this.ParseSearchResponse(networkResponse)
    }

    static async SetInputValue(page: Page, inputSelector: string | string[], value: boolean | string, searchBtnID: string | undefined = undefined): Promise<boolean | string[][]> {
        if (!Array.isArray(inputSelector))
            inputSelector = [inputSelector]

        const inputType = await this.GetInputType(page, inputSelector[0])
        switch (inputType) {
            case INPUT_TYPES.Radio:
                if (typeof value !== "boolean")
                    throw new TypeError("Résultat du prompt inattendu. \"Booléen\" attendu.")
                if (value)
                    Misc.ClickOnElem(page, inputSelector[0])
                else
                    Misc.ClickOnElem(page, inputSelector[1])
                return true

            case INPUT_TYPES.Select:
                if (typeof value !== "string")
                    throw new TypeError("Résultat du prompt inattendu. \"String\" attendu.")
                const elem = await Misc.GetElemBySelector(page, value)
                if (!elem)
                    throw new Error("Pas trouvé de valeur d'input correspondant au sélecteur " + value)
                await Misc.ClickOnElem(page, value)
                return true

            case INPUT_TYPES.Text:
                if (typeof value !== "string")
                    throw new Error("Résultat du prompt inattendu. \"String\" attendu.")
                await Misc.FocusElemAndType(page, inputSelector[0], value)
                return true

            case INPUT_TYPES.Search:
                if (typeof value !== "string")
                    throw new Error("Résultat du prompt inattendu. \"String\" attendu.")
                if (!searchBtnID)
                    throw new Error("Pas trouvé le bouton de recherche")
                return await this.FillSearchInputAndGetResults(page, inputSelector[0], searchBtnID, value)

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
    static async IsAlreadyValidSearch(page: Page, input: ElementHandle): Promise<boolean> //Certains input de recherche (eg. "Operating System Build" dans stock device) ont déjà une valeur séléctionnée
    {
        const SelectedValue = await input.$(Selectors.SEARCH_SELECTED_VALUE)
        return (SelectedValue !== null)
    }
    static async GetSearchBtn(parent: ElementHandle<Element>) {
        const searchBtn = await parent.$(Selectors.INPUT_SEARCH_SUBMIT_BTN)
        if (!searchBtn)
            throw new Error("Pas trouvé le bouton de recherche")
        return searchBtn
    }
    static async FillInputAndGetNextInputIndexAndValue(page: Page, stepID: string, inputIndex: number, value: string | boolean | undefined = undefined): Promise<{ value: boolean | string, index: number }> {
        let canceled = false
        const options: PromptOptions = { onCancel: () => canceled = true }
        const input = await this.GetFormInput(page, inputIndex)
        if (!input)
            throw new Error("Pas réussi à récupérer l'input n°" + inputIndex)

        const innerInput = await input.$(Selectors.INNER_INPUT)
        if (!innerInput)
            return await this.FillInputAndGetNextInputIndexAndValue(page, stepID, ++inputIndex, value) //Il y a de "faux" inputs (Eg. run predefined script) qui ne contiennent que du texte, si c'est le cas on skip l'élément

        const title = (await ServicePortal.GetInputTitle(page, inputIndex))

        const inputID = [await Misc.SetElemID(input, stepID + CUSTOM_IDs.INPUT + inputIndex)]
        const innerInputId = [await Misc.SetElemID(innerInput, stepID + CUSTOM_IDs.INNER_INPUT + inputIndex)]
        let searchBtnID = undefined

        if (!title)
            throw new Error("Pas trouvé le titre de l'input")

        const inputType = await this.GetInputType(page, inputID[0])
        if (!inputType)
            throw new Error("Pas trouvé le type de l'input")

        if (inputType === INPUT_TYPES.Select)
            await this.CreateChoicesFromSelect(page, innerInputId[0]) //NÉCÉSSAIRE; La fonction donne des IDs uniques aux choix du select

        if (value === undefined) {
            let prompt = await ServicePortal.CreatePromptFromInput(page, innerInputId[0], title, 'TMP')
            value = (await prompts(prompt, options))['TMP'] as string | boolean
        }
        if (canceled)
            return { value: false, index: -1 }

        switch (inputType) {
            case INPUT_TYPES.Radio: //Si l'input est de type Radio, il faut sélectionner deux valeurs : Oui et Non
                const radios = await input.$$(Selectors.INNER_INPUT)
                if (!radios || radios.length < 2)
                    throw new Error("Pas trouvé le second radio input")
                innerInputId.push(await Misc.SetElemID(radios[1], stepID + CUSTOM_IDs.INNER_INPUT + inputIndex))
                break;
            case INPUT_TYPES.Search:
                searchBtnID = await Misc.SetElemID(await this.GetSearchBtn(input), stepID + CUSTOM_IDs.SEARCH_BTN + inputIndex)
                break;
        }

        if (innerInputId.length <= 0)
            throw new Error("Pas réussi à trouver l'input")

        let response = await this.SetInputValue(page, innerInputId, value, searchBtnID)

        if (inputType === INPUT_TYPES.Search) {
            if (response === false) {
                console.log("Aucun résultats")
                await Misc.ClearTextbox(page, innerInputId[0])
                return await ServicePortal.FillInputAndGetNextInputIndexAndValue(page, stepID, inputIndex)
            }
            //Si l'utilisateur a fait une recherche et il y a plus d'un résultat 
            if (Array.isArray(response)) {
                value = await this.HandleSearchResults(page, stepID + CUSTOM_IDs.SEARCH_RESULTS + inputIndex, input, innerInputId[0], response)
            }
        }
        inputIndex++ //On retourne l'index du prochain élément ; Cela est nécessaire à cause des Radios buttons (voir 16 lignes au dessus)
        return { value: value, index: inputIndex }
    }

    static async FillForm(page: Page, stepNumber: number, startIndex: number = 0, fillOnlyOneInput = false, values: undefined | any | any[] = undefined): Promise<false | { value: string | boolean, index: number }[]> { //Si fillOneInput = true, on set seulement l'input à startingIndex
        let i = startIndex,
            validInputIndex = 0,
            input: ElementHandle<Element> | ElementHandle<Element>[] | false,
            promptAnswer,
            answers = [],
            tmpVal = undefined
        const STEP_ID = CUSTOM_IDs.STEP + stepNumber
        if (values && !Array.isArray(values))
            values = [values]
        await Misc.sleep(1000) //@TODO trouver quelque chose de plus solide. Nécessaire car certaines forms (eg assign) chargent d'abord une étape "get user"
        while (input = (await ServicePortal.GetFormInput(page, i))) { // GetFormInputs retourne False quand aucun élément n'est trouvé. L'évaluation d'une assignation en JS retourne la valeur assignée
            if (await this.IsAlreadyValidSearch(page, input)) { //@TODO Trouver quelque chose de plus solide ? (nécessaire???). Les inputs "Search" qui commencent avec une valeur présélectionnée devraient généralement être remplacés par des selects
                i++
                continue;
            }

            if (!values)
                tmpVal = undefined
            else if (!values[validInputIndex]) {
                console.log("Pas assez de valeurs pour remplir la form automatiquement")
                tmpVal = undefined
            } else
                tmpVal = values[validInputIndex]

            promptAnswer = await this.FillInputAndGetNextInputIndexAndValue(page, STEP_ID, i, tmpVal)
            if (promptAnswer.value === false || !promptAnswer.index) //User cancelled
                return false
            if(validInputIndex === 0 && stepNumber === 0){
                //await Misc.waitForNetworkIdle(page, 10000, 1500, 500, 2)
                //await Misc.waitForNetworkIdle(page)
                await Misc.sleep(350) //@MALDETETE rien d'autre fonctionne @TODO plus solide????))
            }
            i = promptAnswer.index
            answers.push(promptAnswer)
            if (fillOnlyOneInput)
                return answers
            validInputIndex++
        }
        return answers

    }

    static async HandleSearchResults(page: Page, stepID: string, parentDiv: ElementHandle<Element>, inputID: string, response: string[][]): Promise<string> {
        let choices: Choice[] = []
        const lines = Misc.FormatStringRows(response)
        for (let i = 0; i < response.length; i++)
            choices.push({ title: lines[i], value: i })

        const prompt = await ServicePortal.CreatePromptFromInput(page, inputID, "Résultats de la recherche :", 'TMP', choices)
        let answerIndex = (await prompts(prompt))['TMP']
        const searchResults = await parentDiv.$$(Selectors.INPUT_SEARCH_VALUES)
        if (!searchResults || searchResults.length < answerIndex)
            throw new Error("Failed to select search values")
        if (ServicePortal.Settings.SHOULD_SEARCH_RESULTS_HAVE_HEADERS) {
            if (answerIndex === 0)
                throw new Error("Merci de ne pas sélectionner les en-têtes des résultats de recherche")
            else
                answerIndex = parseInt(answerIndex) - 1
        }
        const answerID = await Misc.SetElemID(searchResults[answerIndex], stepID + CUSTOM_IDs.SELECTED_VALUE)
        await Misc.ClickOnElem(page, answerID)
        return answerID
    }

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

    static async GoToFormNextStep(page: Page, stepNumber: number): Promise<boolean | string> {
        const nextStepBtn = await page.$(Selectors.BUTTON_NEXT)
        const STEP_ID = CUSTOM_IDs.STEP + stepNumber
        if (nextStepBtn) {
            const currID = await Misc.SetElemID(nextStepBtn, STEP_ID + CUSTOM_IDs.CURRENT_NEXT_STEP_BTN)
            const notCurrentID = ':not(' + currID + ')'
            await Misc.ClickAndWaitForSelector(page, currID, `${Selectors.BUTTON_NEXT + notCurrentID}, ${Selectors.BUTTON_SUBMIT + notCurrentID}`) //On clique sur le bouton "next step", puis on attends que le prochain bouton (next ou submit) charge (waitForNavigation NOK car l'application est en Single-Page)
            return true
        }
        const submitBtn = await Misc.GetElemBySelector(page, Selectors.BUTTON_SUBMIT)
        if (!submitBtn)
            return false
        const currID = await Misc.SetElemID(submitBtn, STEP_ID + CUSTOM_IDs.CURRENT_SUBMIT_BTN)
        return await this.SubmitAndGetSR(page, currID)
    }

    static async GetChoicesFromTiles(page: Page, tiles: ElementHandle<Element>[]): Promise<Choice[]> {
        const result: Choice[] = [];
        let tileText: TileTextInfo | false,
            i = 0,
            shouldSetIDs = !(await Misc.ElementExists(page, `#${CUSTOM_IDs.TILE}0`)), //Évite d'avoir à communiquer avec la page lorsque pas nécessaire
            currTileID: string

        for (let tile of tiles) {
            currTileID = CUSTOM_IDs.TILE + i
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

    static async SuggestFullTextSpaceSeparatedExactMatch(input: string, choices: Choice[]): Promise<Choice[]> { //Split input à chaque espace, et retourne les éléments qui contiennent chacun des mots obtenus ainsi
        return await choices.filter(elem => Misc.IncludesAll(`${elem.title} ${elem?.description}`, input.split(' ')))
    }

    static async GetValuesElementsFromSelectInput(page: Page, inputSelector: string): Promise<ElementHandle[]> {
        const valuesList = await Misc.GetMultipleElemsBySelector(page, `${inputSelector} + ${Selectors.INPUT_SELECT_VALUES}`) //Le sélecteur + séléctionne les siblings
        if (!valuesList || valuesList.length <= 0)
            throw new Error("Pas réussi à récupérer les values du select " + inputSelector)
        return valuesList
    }

    static async CreateChoicesFromSelect(page: Page, inputSelector: string): Promise<Choice[]> {
        const elems = await this.GetValuesElementsFromSelectInput(page, inputSelector)
        if (!elems)
            throw new Error("Pas trouvé les valeurs du select " + inputSelector)
        return await Promise.all(elems.map(
            async function (elem: ElementHandle, i: number): Promise<Choice> {
                const elemID = await Misc.SetElemID(elem, inputSelector.slice(1) + CUSTOM_IDs.INPUT_SELECT_VALUES + i) //On enlève le '#' du sélecteur parent. Il est important de garder la hiérarchie entière, pour éviter d'avoir des ID en doubles
                const text = await Misc.GetTextFromElement(elem)
                if (!text)
                    throw new Error("Pas réussi à récupérer les choix du select");
                return { title: text, value: elemID }
            }))
    }

    static async CreatePromptFromInput(page: Page, inputSelector: string, text: string, name: string, choices: Choice[] | undefined = undefined, desiredType: INPUT_TYPES | false = false): Promise<Prompt> {
        const inputType: INPUT_TYPES = (!desiredType) ? await this.GetInputType(page, inputSelector) : desiredType
        const inputRquired = await this.IsInputRequired(page, inputSelector) //@TODO pas fiable (Eg. "Select device" dans run predefined script n'est pas affiché comme requis)
        if (!inputType)
            throw new Error("Pas trouvé le type de l'input")
        if (inputType === INPUT_TYPES.Select)
            choices = await this.CreateChoicesFromSelect(page, inputSelector)

        let type: PromptTypes

        if (inputType as INPUT_TYPES == INPUT_TYPES.Search && choices !== undefined)
            type = PromptTypes.autocomplete
        else
            type = await this.GetPromptTypeFromInputType(inputType)
        const shouldValidate = inputRquired && (inputType !== INPUT_TYPES.Radio && inputType !== INPUT_TYPES.Button && INPUT_TYPES.Unknown)
        return {
            message: text + ((inputRquired) ? Text.INPUT_REQUIRED : ''),
            name: name,
            type: type,
            choices: choices,
            validate: (shouldValidate) ? this.ValidateRequiredUserInput : undefined,
            suggest: (type === PromptTypes.autocomplete) ? this.SuggestFullTextSpaceSeparatedExactMatch : undefined
        }
    }

    static ValidateRequiredUserInput(value: string): boolean | string {
        return (value.length >= 3) ? true : Text.INPUT_INVALID
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
        if (await Misc.ElementExists(page, Selectors.TILE)) // /!\ Il faut vérifier si la page contient des tiles avant de vérifier si elle contient une form, car certaines forms contiennent des tiles
            return LAYOUT_TYPES.Tiles

        if (await Misc.ElementExists(page, Selectors.FORM))
            return LAYOUT_TYPES.Form

        console.log("Unknown layout type")
        return LAYOUT_TYPES.Unknown

    }
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

    static async GetCategoryFromTile(page: Page, selector: string): Promise<string | undefined> {
        return await Misc.GetMatchingParentText(page, selector, Selectors.TILE_FOLD_ELEM, Selectors.TILE_FOLD_INNER_TITLE)
    }

    static async GetTitleAndCategoryFromTile(page: Page, elSelector: string): Promise<TileTextInfo> {
        return { name: await ServicePortal.GetTitleFromTile(page, elSelector), category: await ServicePortal.GetCategoryFromTile(page, elSelector) }
    }

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

    static async GetTileGUIDBySelector(page: Page, selector: string) {
        const elem = await Misc.GetElemBySelector(page, selector)
        if (!elem)
            throw new Error("Pas réussi à trouver la tile " + selector)
        let groups = (await (await elem.getProperty('href')).jsonValue() as string).match(Regexes.TILE_GUID)
        if (!groups || groups.length == 1) //string.match retourne le string si celui a matché à l'index 0, puis chaque groupe dans les index suivants
            throw new Error("Pas réussi à récupérer le GUID de la tuile " + selector)
        return groups[1]
    }

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

