import { Browser, ElementHandle, Page } from "puppeteer";
import { URLs, SELECTORS, MISC, PROMPTS } from "./consts"
import { Question, PromptCallback, PromptFields, PromptTypes } from './questions'

const puppeteer = require('puppeteer');
const prompts = require('prompts');

(async () => {
  const browser: Browser = await puppeteer.launch({ headless: true });
  const page: Page = await browser.newPage();

  await page.goto('https://serviceportal.srgssr.ch');
  if (isSSRLogin(page.url())) {
    await SSRLogin(page)
  }
  //@TODO Create 'modules' folder
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

function isSSRLogin(url: string): boolean {
  return url.includes(URLs.SRG_AUTH);
}

async function submitAndWaitForLoad(page: Page, el: ElementHandle) {
  await el.click();
  await page.waitForNavigation({ waitUntil: "domcontentloaded" })
}

async function SSRLogin(page: Page) {
  await page.waitForSelector(SELECTORS.AUTH_SUBMIT);

  const inputUsername: ElementHandle | null = await page.$(SELECTORS.AUTH_USERNAME)
  const inputPWD: ElementHandle | null = await page.$(SELECTORS.AUTH_PWD)
  let inputSubmit: ElementHandle | null = await page.$(SELECTORS.AUTH_SUBMIT)

  if (!inputUsername || !inputPWD || !inputSubmit)
    throw new Error("Pas trouvé le champ username, mot de passe, ou le bouton envoyer")

  //Demande les informations de login à l'utilisateur
  const loginInfo = await prompts(PROMPTS.AUTH_SRG)
  await inputUsername.type(loginInfo[PromptFields.username]);
  await inputPWD.type(loginInfo[PromptFields.password]);
  await submitAndWaitForLoad(page, inputSubmit);

  //Demande le One Time Password (Code SMS) à l'utilisateur
  const inputOTP: ElementHandle | null = await page.$(SELECTORS.AUTH_OTP);
  inputSubmit = await page.$(SELECTORS.AUTH_SUBMIT)

  if (!inputOTP || !inputSubmit)
    throw new Error("Pas trouvé le champ Code SMS, ou le bouton envoyer")

    
  const OTP = await prompts(PROMPTS.AUTH_SRG_OTP)
  await inputOTP.type(OTP[PromptFields.otp]);
  await submitAndWaitForLoad(page, inputSubmit);
}