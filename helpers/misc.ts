import { ElementHandle, Page, PageEmittedEvents } from "puppeteer";

const TAB_WIDTH = 4
//Miscellaneous helpers
export class Misc {
    static FormatStringRows(values: string[][]): string[] { //Prend un string[][], et retourne un string[] dans lequel les valeurs sont alignées
        let maxWidthPerCol = [],
            results = []
        for (let row = 0; row < values.length; row++) { //On récupère la longueur maximale de chaque colonne, afin de pouvoir les aligner correctement
            for (let col = 0; col < values[row].length; col++) {
                if (maxWidthPerCol.length <= col)
                    maxWidthPerCol.push(values[row][col].length + TAB_WIDTH) //On ajoute au moins une tabulation entre chaque colonne
                else {
                    if (values[row][col].length + TAB_WIDTH > maxWidthPerCol[col])
                        maxWidthPerCol[col] = values[row][col].length + TAB_WIDTH
                }
            }
        }
        let rowAsStr,
            nbTabs = 0,
            nbSpaces = 0
        for (let row = 0; row < values.length; row++) { //On aligne chaque colonne
            rowAsStr = ''
            for (let col = 0; col < values[row].length; col++) {
                nbTabs = (maxWidthPerCol[col] - values[row][col].length) / TAB_WIDTH 
                nbSpaces = TAB_WIDTH * (nbTabs % 1) //Eg. 4 * (2.25 % 1) => 4 * 0.25 => 1
                rowAsStr += values[row][col] + ' '.repeat(nbSpaces) + ' '.repeat(TAB_WIDTH).repeat(nbTabs) //Apparemment le terminal de VS Code n'a pas de taille définie pour les tabs, donc il faut utiliser des espaces à la place de \t
            }
            results.push(rowAsStr)
        }
        return results
    }
    static IncludesAtLeastOne(str:string, values:string[]):boolean{
        for(let arg of values){
            if(str.toLocaleLowerCase().includes(arg.toLocaleLowerCase()))
                return true
        }
        return false
    }

    static IncludesAll(str:string, values:string[]):boolean{
        return values.every((val) => str.toLocaleLowerCase().includes(val.toLocaleLowerCase()))
    }
    
    static sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async GetTextFromElement(element: ElementHandle<Element> | null): Promise<string | false> {
        if (!element || element === undefined)
            return false
        
        const result = await element.evaluate(el => el?.textContent)
        if(!result)
            throw new Error("Couldn't get text from element " + await element.getProperty('id') + ' ' + await element.getProperty('class'))

        if (typeof result !== "string")
            return false

        return result
    }

    static async GetTextFromElements(elements: ElementHandle<Element>[]): Promise<(string | false)[]> {
        const result: (string | false)[] = []
        for (let elem of elements) {
            result.push(await this.GetTextFromElement(elem))
        }
        return result
    }

    static async WaitForLoad(page: Page) {
        await page.waitForNavigation({ waitUntil: "domcontentloaded" })
    }

    static async GotoAndWaitForSelector(page: Page, url: string, selector: string, waitForHidden = false) {
        await Promise.all([
            page.goto(url),
            (waitForHidden) ? this.WaitForLoad(page) : page.waitForSelector(selector) //Si on attends qu'un sélecteur soit caché, il vaut mieux attendre que la page charge ; Sinon on attends directement de voir l'élément
        ])
        if (waitForHidden)
            await this.WaitForSelectorHidden(page, selector);
    }

    static async GotoAndWaitForLoad(page: Page, url: string) {
        await Promise.all([
            page.goto(url),
            this.WaitForLoad(page)
        ]);
    }

    static async ClickOnElem(page:Page, selector:string){
        return await page.click(selector)
    }

    static async FocusElemAndType(page:Page, itemSelector:string, value:string){
        await page.focus(itemSelector)
        await page.keyboard.type(value)
    }

    static async ClickAndWaitForLoad(page: Page, selector:string) { //Il faut utiliser le selecteur car element.click() n'est pas toujours détecté
        await Promise.all([
            Misc.ClickOnElem(page, selector),
            this.WaitForLoad(page)
        ]);
    }

    static async ClickAndWaitForSelector(page: Page, elementSelector:string, loadingSelector: string, waitForHidden = false, timeout = DEFAULT_TIMEOUT) {
        await Promise.all([
            Misc.ClickOnElem(page, elementSelector),
            (waitForHidden) ? this.WaitForLoad(page) : page.waitForSelector(loadingSelector, { timeout: timeout })
        ])
        if (waitForHidden)
            await this.WaitForSelectorHidden(page, loadingSelector);
    }

    static async ClickAndWaitForNetworkIdle(page: Page, elementSelector:string) {
        await Promise.all([
            Misc.ClickOnElem(page, elementSelector),
            page.waitForNavigation({waitUntil:"networkidle0"})
        ])
    }

    static async SetElemID(elem:ElementHandle<Element>, id:string):Promise<string>{
        await elem.evaluate((el, value) => el.id = value, id)
        return '#' + id
    }

    static async GetElemBySelector(page:Page, selector:string):Promise<ElementHandle<Element>|false>{
        let elem = await page.$(selector)
        if(!elem)
            return false
        return elem
    }

    static async GetMultipleElemsBySelector(page:Page, selector:string):Promise<ElementHandle<Element>[]|false>{
        let elem = await page.$$(selector)
        if(!elem || elem.length <= 0)
            return false
        return elem
    }

    static async ElementExists(page:Page, selector:string):Promise<boolean>{
        return (await this.GetElemBySelector(page, selector) !== false)
    }

    static async WaitForSelectorHidden(page: Page, selector: string, timeout = DEFAULT_TIMEOUT) {
        //waitForHidden attends qu'un élément soit caché. avant de checker si celui-ci est caché, on attends qu'il apparaîsse, au cas-où il est lazy-loadé
        await page.waitForSelector(selector, { visible: true, timeout: timeout })
        await page.waitForSelector(selector, { hidden: true, timeout: timeout })
    }

}

const DEFAULT_TIMEOUT = 30000;