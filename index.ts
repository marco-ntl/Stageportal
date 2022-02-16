import { Browser, ElementHandle, Page } from "puppeteer";
import { IModule } from "./types/IModule";
import { Prompt, PromptTypes } from './types/prompt'

const puppeteer = require('puppeteer');
export const prompts = require('prompts');

(async () => {
  const browser: Browser = await puppeteer.launch({ headless: true });
  const page: Page = await browser.newPage();
  let SRGLogin:IModule = require('./modules/SRGLogin')
  await SRGLogin.run(browser, page);
  //@TODO Finsh Assign module
  //@TODO Generate autocomplete prompt, with each module as a value
  //@TODO Import and run chosen module
  //@TODO "Stage" module
  //      Prompt {type:list, separator:' ',
  //      message:'Numéros, séparés par un espace Ex. RTSC014001 14002'}
  //@TODO "Confirmations" module
  //      Prompt {type:autocomplete} -> Prompt {type:confirm, message: "Valider ?"} -> Si 'n' Prompt {type:confirm, message: "Mettre en échec ?"}
  //@TODO "Profile" module
  //      View/change attributes of Hardware, SR and Persons
  await page.screenshot({ path: 'example.png' });
  await browser.close();
})();

export async function submitAndWaitForLoad(page: Page, el: ElementHandle) {
  await el.click();
  await page.waitForNavigation({ waitUntil: "domcontentloaded" })
}

