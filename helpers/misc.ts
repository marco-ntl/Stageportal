import { ElementHandle, Page } from "puppeteer";
const TAB_WIDTH = 4
//Miscellaneous helpers
export class Misc {
    static FormatStringRows(values: string[][]): string[] { //Prend un string[][], et retourne un string[] dans lequel les valeurs sont alignées
        let maxWidthPerCol = [],
            results = []
        for (let row = 0; row < values.length; row++) { //On récupère la longueur maximale de chaque colonne, afin de pouvoir les aligner correctement
            for (let col = 0; col < values[row].length; col++) {
                if (maxWidthPerCol.length <= col)
                    maxWidthPerCol.push(values[row][col].length)
                else {
                    if (values[row][col].length > maxWidthPerCol[col])
                        maxWidthPerCol[col] = values[row][col].length
                }
            }
        }
        let rowAsStr,
            nbTabs = 0,
            nbSpaces = 0
        for (let row = 0; row < values.length; row++) { //On aligne chaque colonne
            rowAsStr = ''
            for (let col = 0; col < values[row].length; col++) {
                nbTabs = Math.floor(maxWidthPerCol[col] - values[row][col].length) / TAB_WIDTH
                nbSpaces = Math.floor(maxWidthPerCol[col] - values[row][col].length) % TAB_WIDTH
                rowAsStr += values[row] + ' '.repeat(nbSpaces) + '\t'.repeat(nbTabs)
            }
            results.push(rowAsStr)
        }
        return results
    }

    static sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async GetTextFromElement(element: ElementHandle | null): Promise<string | false> {
        if (!element)
            return false

        const result = await element.evaluate(el => el.textContent)

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

    static async ClickAndWaitForLoad(page: Page, el: ElementHandle) {
        await Promise.all([
            el.click(),
            this.WaitForLoad(page)
        ]);
    }

    static async ClickAndWaitForSelector(page: Page, el: ElementHandle, selector: string, waitForHidden = false, timeout = DEFAULT_TIMEOUT) {
        await Promise.all([
            el.click(),
            (waitForHidden) ? this.WaitForLoad(page) : page.waitForSelector(selector, { timeout: timeout })
        ])
        if (waitForHidden)
            await this.WaitForSelectorHidden(page, selector);
    }

    static async WaitForSelectorHidden(page: Page, selector: string, timeout = DEFAULT_TIMEOUT) {
        //waitForHidden attends qu'un élément soit caché. avant de checker si celui-ci est caché, on attends qu'il apparaîsse, au cas-où il est lazy-loadé
        await page.waitForSelector(selector, { visible: true, timeout: timeout })
        await page.waitForSelector(selector, { hidden: true, timeout: timeout })
    }

}

const DEFAULT_TIMEOUT = 30000;