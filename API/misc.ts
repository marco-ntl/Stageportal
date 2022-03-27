import { Browser, ElementHandle, Page, PageEmittedEvents, PuppeteerLifeCycleEvent } from "puppeteer";

const TAB_WIDTH = 4
//Miscellaneous helpers
export class Misc {

    /**
     * Retourne True si obj est de type Browser
     *
     * @static
     * @param {*} obj L'objet à checker
     * @return {*}  {obj is Browser} Est-ce que l'objet est un Browser (vérifie si l'objet contient une fonction "newPage")
     * @memberof Misc
     */
    static isBrowser(obj: any): obj is Browser {
        return obj && "newPage" in obj;
    }
    
    /**
     * Retourne une fonction de prédicat, qui retourne true lorsqu'elemToMatch est trouvé dans une des lignes d'un tableau passé à la fonction de prédicat
     *
     * @static
     * @param {*} elemToMatch L'élément à trouver
     * @return {*} Fonction de prédicat prenant un tableau 2D, qui retourne true si elemToMatch est contenu dans le tableau 2D
     * @memberof Misc
     */
    static GeneratePredicateFunc(elemToMatch: any) {
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

    
    /**
     * Formatte un tableau 2D, afin de l'afficher proprement à l'utilisateur
     *
     * @static
     * @param {string[][]} values
     * @return {*}  {string[]}
     * @memberof Misc
     */
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

    /**
     * Retourne True si au moins une des valeurs dnas values contient str
     *
     * @static
     * @param {string} str Le texte recherché
     * @param {string[]} values Tableau de texte à chercher
     * @return {*}  {boolean} Est-ce que values contient str ?
     * @memberof Misc
     */
    static IncludesAtLeastOne(str: string, values: string[]): boolean {
        for (let arg of values) {
            if (str.toLocaleLowerCase().includes(arg.toLocaleLowerCase()))
                return true
        }
        return false
    }

    /**
     * Comme IncludesAtLeastOne, à la différence que toutes les valeurs dans values doivent matcher str
     *
     * @static
     * @param {string} str Le string recherché
     * @param {string[]} values Tableau de texte à rechercher
     * @return {*}  {boolean} Est-ce que chacune des valeur contient str ?
     * @memberof Misc
     */
    static IncludesAll(str: string, values: string[]): boolean {
        return values.every((val) => str.toLocaleLowerCase().includes(val.toLocaleLowerCase()))
    }

    /**
     * Pause l'éxécution pendant le temps spécifié
     *
     * @static
     * @param {number} ms Le temps à attendre en ms
     * @return {*} 
     * @memberof Misc
     */
    static sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retourne le texte d'un élément HTML
     *
     * @static
     * @param {ElementHandle<Element>} element L'élément
     * @return {*}  {(Promise<string | false>)} Le texte, ou false si pas de texte
     * @memberof Misc
     */
    static async GetTextFromElement(element: ElementHandle<Element>): Promise<string | false> {
        const result = await element.evaluate(el => el?.textContent)
        if (typeof result !== "string")
            return false
        return result
    }

    /**
     * Retourne la valeur actuelle d'un input
     *
     * @static
     * @param {Page} page
     * @param {string} selector Le sélécteur de l'input
     * @return {*}  {(Promise<string | false>)} La valeur, ou false si inexistante
     * @memberof Misc
     */
    static async GetValueFromInput(page: Page, selector: string): Promise<string | false> {
        const result = await page.$eval(selector, el => (el as HTMLInputElement).value)
        if (typeof result !== "string")
            return false
        return result
    }

    /**
     * Retourne le texte de tous les éléments spécifiés
     *
     * @static
     * @param {ElementHandle<Element>[]} elements Les éléments
     * @return {*}  {(Promise<(string | false)[]>)} Le texte de chaque élément, et false pour les éléments sans texte
     * @memberof Misc
     */
    static async GetTextFromElements(elements: ElementHandle<Element>[]): Promise<(string | false)[]> {
        const result: (string | false)[] = []
        for (let elem of elements) {
            result.push(await this.GetTextFromElement(elem))
        }
        return result
    }

    /**
     * Attends que la page ait fini de charger.
     *
     * @static
     * @param {Page} page
     * @param {(PuppeteerLifeCycleEvent | undefined)} [waitUntil="domcontentloaded"]
     * @memberof Misc
     */
    static async WaitForLoad(page: Page, waitUntil: PuppeteerLifeCycleEvent | undefined = "domcontentloaded") {
        await page.waitForNavigation({ waitUntil: waitUntil })
    }

    /**
     * Ouvre l'url spécifiée, et attends que l'objet avec le sélécteur spécifié apparaisse
     *
     * @static
     * @param {Page} page
     * @param {string} url L'url à visiter
     * @param {string} selector Le sélécteur de l'élément à attendre
     * @param {boolean} [waitForHidden=false] Faut-il attendre jusqu'à ce que l'élément soit caché ? (Eg. icône de chargement)
     * @memberof Misc
     */
    static async GotoAndWaitForSelector(page: Page, url: string, selector: string, waitForHidden = false) {
        await Promise.all([
            page.goto(url),
            (waitForHidden) ? this.WaitForLoad(page) : page.waitForSelector(selector) //Si on attends qu'un sélecteur soit caché, il vaut mieux attendre que la page charge ; Sinon on attends directement de voir l'élément
        ])
        if (waitForHidden) {
            await this.WaitForSelectorVisible(page, selector)
            await this.WaitForSelectorHidden(page, selector);
        }
    }

    /**
     * Visite l'url spécifiée et attends que la page ait fini de charger
     *
     * @static
     * @param {Page} page
     * @param {string} url L'url à visiter
     * @memberof Misc
     */
    static async GotoAndWaitForLoad(page: Page, url: string) {
        await Promise.all([
            page.goto(url),
            this.WaitForLoad(page)
        ]);
    }

    /**
     * Visite l'url spécifiée et attends qu'il n'y ait plus de requête réseau pendant 2s
     *
     * @static
     * @param {Page} page
     * @param {string} url
     * @memberof Misc
     */
    static async GotoAndWaitForNetworkIdle(page: Page, url: string) {
        await Promise.all([
            page.goto(url),
            page.waitForNavigation({ waitUntil: "networkidle0" })
        ])
    }

    /**
     * Clique sur l'élément spécifié
     *
     * @static
     * @param {Page} page La page; Nécessaire car Angular ne reconnaît pas forcément les clics non émulés à travers la page
     * @param {string} selector Le sélécteur de l'objet sur lequel cliquer
     * @return {*} 
     * @memberof Misc
     */
    static async ClickOnElem(page: Page, selector: string) {
        return await page.evaluate(selector => document.querySelector(selector).click(), selector) //Angular n'aime pas Puppeteer. La seule manière fiable de cliquer sur un élément en injectant le clic dans la page :)
    }

    /**
     * Focus l'élément spécifié, et tappe le texte spécifié
     *
     * @static
     * @param {Page} page 
     * @param {string} itemSelector Le sélécteur de l'élément
     * @param {string} value La valeur à tapper dans l'élément
     * @memberof Misc
     */
    static async FocusElemAndType(page: Page, itemSelector: string, value: string) {
        await page.focus(itemSelector)
        await page.keyboard.type(value)
    }

    /**
     * Clear une textbox
     *
     * @static
     * @param {Page} page
     * @param {string} tbxSelector La textbox à clearer
     * @memberof Misc
     */
    static async ClearTextbox(page: Page, tbxSelector: string) { //Clear la textbox via des Backspaces
        const currText = await Misc.GetValueFromInput(page, tbxSelector)
        if (!currText)
            return
        await page.focus(tbxSelector)
        for (let i = 0; i < currText.length; i++) {
            await page.keyboard.press('Backspace')
        }

    }

    /**
     * Clique sur l'élément spécifié, et attends le chargement de la page
     *
     * @static
     * @param {Page} page
     * @param {string} selector L'élément sur lequel cliquer
     * @memberof Misc
     */
    static async ClickAndWaitForLoad(page: Page, selector: string) { //Il faut utiliser le selecteur car element.click() n'est pas toujours détecté
        await Promise.all([
            Misc.ClickOnElem(page, selector),
            this.WaitForLoad(page)
        ]);
    }

    /**
     * Clique sur l'élément spécifié, et attends que l'élément loadingSelector soit apparu. Si waitForHidden, attends que loadingselector disparaisse
     *
     * @static
     * @param {Page} page
     * @param {string} elementSelector L'élément sur lequel cliquer
     * @param {string} loadingSelector L'élément à attendre
     * @param {boolean} [waitForHidden=false] Est-ce qu'il faut attendre jusqu'à ce que loadingSelector soit caché =
     * @param {*} [timeout=DEFAULT_TIMEOUT] Le timeout
     * @memberof Misc
     */
    static async ClickAndWaitForSelector(page: Page, elementSelector: string, loadingSelector: string, waitForHidden = false, timeout = DEFAULT_TIMEOUT) {
        await Promise.all([
            Misc.ClickOnElem(page, elementSelector),
            (waitForHidden) ? this.WaitForLoad(page) : page.waitForSelector(loadingSelector, { timeout: timeout })
        ])
        if (waitForHidden) {
            //waitForHidden attends qu'un élément soit caché. avant de checker si celui-ci est caché, on attends qu'il apparaîsse, au cas-où il est lazy-loadé
            await this.WaitForSelectorVisible(page, loadingSelector)
            await this.WaitForSelectorHidden(page, loadingSelector);
        }
    }

    /**
     * Clique sur un élément, et attends qu'il n'y ait plus de requête réseau pendant 2s consécutives
     *
     * @static
     * @param {Page} page
     * @param {string} elementSelector L'élément sur lequel cliquer
     * @memberof Misc
     */
    static async ClickAndWaitForNetworkIdle(page: Page, elementSelector: string) {
        await Promise.all([
            Misc.ClickOnElem(page, elementSelector),
            page.waitForNavigation({ waitUntil: "networkidle0" })
        ])
    }

    /**
     * Set l'ID d'un élément, et retourne le sélecteur de celle-ci
     *
     * @static
     * @param {ElementHandle<Element>} elem L'élément
     * @param {string} id L'ID désirée (sans '#' précédant)
     * @return {*}  {Promise<string>} L'ID, avec un '#' avant afin de pouvoir être utilisé comme sélécteur
     * @memberof Misc
     */
    static async SetElemID(elem: ElementHandle<Element>, id: string): Promise<string> {
        await elem.evaluate((el, value) => el.id = value, id)
        return '#' + id
    }

    /**
     * Retourne l'élément correspondant au sélécteur spécifié
     *
     * @static
     * @param {Page} page 
     * @param {string} selector Le sélécteur
     * @return {*}  {(Promise<ElementHandle<Element> | false>)} L'élément, ou false
     * @memberof Misc
     */
    static async GetElemBySelector(page: Page, selector: string): Promise<ElementHandle<Element> | false> {
        let elem = await page.$(selector)
        if (!elem)
            return false
        return elem
    }

    /**
     * Retourne tous les éléments correspondant au sélécteur spécifié
     *
     * @static
     * @param {Page} page
     * @param {string} selector Le sélécteur
     * @return {*}  {(Promise<ElementHandle<Element>[] | false>)} Liste d'éléments
     * @memberof Misc
     */
    static async GetMultipleElemsBySelector(page: Page, selector: string): Promise<ElementHandle<Element>[] | false> {
        let elem = await page.$$(selector)
        if (!elem || elem.length <= 0)
            return false
        return elem
    }

    /**
     * Retourne True si un élément correspondant au sélécteur existe
     *
     * @static
     * @param {Page} page
     * @param {string} selector Le sélécteur
     * @return {*}  {Promise<boolean>} Est-ce qu'un élément matche selector ?
     * @memberof Misc
     */
    static async ElementExists(page: Page, selector: string): Promise<boolean> {
        return (await this.GetElemBySelector(page, selector) !== false)
    }

    /**
     * Attends jusqu'à ce qu'un élément avec le selecteur indiqué soit visible
     *
     * @static
     * @param {Page} page
     * @param {string} selector Le sélécteur
     * @param {number} [timeout=DEFAULT_TIMEOUT]
     * @memberof Misc
     */
    static async WaitForSelectorVisible(page: Page, selector: string, timeout:number = DEFAULT_TIMEOUT) {
        await page.waitForSelector(selector, { visible: true, timeout: timeout })
    }

    /**
     * Attends jusqu'à ce que l'élément avec le sélécteur indiqué ne soit plus visible
     *
     * @static
     * @param {Page} page
     * @param {string} selector Le sélécteur
     * @param {*} [timeout=DEFAULT_TIMEOUT]
     * @memberof Misc
     */
    static async WaitForSelectorHidden(page: Page, selector: string, timeout = DEFAULT_TIMEOUT) {
        await page.waitForSelector(selector, { hidden: true, timeout: timeout })
    }

    /**
     * Retourne le texte du premier parent (d'un élément) matchant le sélécteur indiqué
     *
     * @static
     * @param {Page} page
     * @param {string} elemSelector Sélécteur de l'élément dont on veut récupérer le texte d'un parent
     * @param {string} parentSelector Sélécteur du parent que l'on veut récupérer
     * @param {(string | null)} [parentInnerSelector=null] Le selecteur de l'élément enfant du parent contenant le texte ; Pas obligatoire
     * @return {*}  {(Promise<string | undefined>)}
     * @memberof Misc
     */
    static async GetMatchingParentText(page: Page, elemSelector: string, parentSelector: string, parentInnerSelector: string | null = null): Promise<string | undefined> { //@TODO voir pour retourner un HTMLElement plutôt que le texte (page.evaluate ne permet pas de retourner d'éléments)
        const parent = await page.evaluate(function (elemSelector: string, parentSelector: string, parentInnerSelector: string | null = null): string | null | undefined {
            const parent = document.querySelector(elemSelector)?.closest(parentSelector);
            if (!parent)
                return null

            if (!parentInnerSelector)
                return parent.textContent
            else
                return parent.querySelector(parentInnerSelector)?.textContent
        }, elemSelector, parentSelector, parentInnerSelector)
        if (!parent)
            return undefined

        return parent
    }

    /*static async waitForNetworkIdle(page: Page) { //SOURCE https://github.com/puppeteer/puppeteer/issues/1353#issuecomment-723164059
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.evaluate(() => history.pushState(null, (null as any), undefined)),
        ]);
    }*/
    /*static waitForNetworkIdle(page:Page, timeout = 30000, waitForFirstRequest = 1000, waitForLastRequest = 200, maxInflightRequests = 0 ) { //Source : https://github.com/puppeteer/puppeteer/issues/1353#issuecomment-648299486
        let inflight = 0;
        let resolve:any;
        let reject:any;
        let firstRequestTimeoutId:any;
        let lastRequestTimeoutId:any;
        let timeoutId:any;
        maxInflightRequests = Math.max(maxInflightRequests, 0);
      
        function cleanup() {
          clearTimeout(timeoutId);
          clearTimeout(firstRequestTimeoutId);
          clearTimeout(lastRequestTimeoutId);
          /* eslint-disable no-use-before-define
          page.removeListener('request', onRequestStarted);
          page.removeListener('requestfinished', onRequestFinished);
          page.removeListener('requestfailed', onRequestFinished);
    /* eslint-enable no-use-before-define
}

function check() {
    if (inflight <= maxInflightRequests) {
        clearTimeout(lastRequestTimeoutId);
        lastRequestTimeoutId = setTimeout(onLastRequestTimeout, waitForLastRequest);
    }
}

function onRequestStarted() {
    clearTimeout(firstRequestTimeoutId);
    clearTimeout(lastRequestTimeoutId);
    inflight += 1;
}

function onRequestFinished() {
    inflight -= 1;
    check();
}

function onTimeout() {
    cleanup();
    reject(new Error('Timeout'));
}

function onFirstRequestTimeout() {
    cleanup();
    resolve();
}

function onLastRequestTimeout() {
    cleanup();
    resolve();
}

page.on('request', onRequestStarted);
page.on('requestfinished', onRequestFinished);
page.on('requestfailed', onRequestFinished);

timeoutId = setTimeout(onTimeout, timeout); // Overall page timeout
firstRequestTimeoutId = setTimeout(onFirstRequestTimeout, waitForFirstRequest);

return new Promise((res, rej) => { resolve = res; reject = rej; });
      }*/

}

const DEFAULT_TIMEOUT = 30000;