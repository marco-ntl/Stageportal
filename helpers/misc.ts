import { ElementHandle, Page } from "puppeteer";
//Miscellaneous helpers
export class Misc {

    static async WaitForLoad(page: Page) {
        await page.waitForNavigation({ waitUntil: "domcontentloaded" })
    }

    static async GotoAndWaitForSelector(page: Page, url: string, selector: string, waitForHidden = false) {
        await Promise.all([
            page.goto(url),
            (waitForHidden)?this.WaitForLoad(page):page.waitForSelector(selector) //Si on attends qu'un sélecteur soit caché, il vaut mieux attendre que la page charge ; Sinon on attends directement de voir l'élément
        ])
        if(waitForHidden)
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
            (waitForHidden)?this.WaitForLoad(page):page.waitForSelector(selector,{timeout:timeout}) 
        ])
        if(waitForHidden)
            await this.WaitForSelectorHidden(page, selector);        
    }

    static async WaitForSelectorHidden(page: Page, selector: string, timeout = DEFAULT_TIMEOUT) {
        //waitForHidden attends qu'un élément soit caché. avant de checker si celui-ci est caché, on attends qu'il apparaîsse, au cas-où il est lazy-loadé
        await page.waitForSelector(selector, { visible: true , timeout:timeout}) 
        await page.waitForSelector(selector, {hidden:true, timeout:timeout})
    }

}

const DEFAULT_TIMEOUT = 30000;