import { Browser, ElementHandle, Page } from "puppeteer";
import Navigation from "./modules/Navigation";
import { IModule } from "./types/IModule";
import { Prompt, PromptTypes } from './types/prompt'

export const puppeteer = require('puppeteer-extra');
puppeteer.use(require('puppeteer-extra-plugin-repl')())
export const prompts = require('prompts');

(async () => {
  //Headless -> Est-ce que la fenêtre Chrome devrait être cachée
  //Doit-être set à False, car sinon aucune des tuiles du serviceportal ne sont chargées
  const browser: Browser = await puppeteer.launch({ headless: false, userDataDir: "./browserData"});
  //@TODO IMPORTANT Implémenter navigation basique à travers les modules (lister les modules et sélectionner via un prompt, Annuler pendant un module, Resélectionner module quand un module a fini son exécution, etc...)
  //@IDEA Ouvrir module en REPL (While(!true){module.run()}) dans une nouvelle fenêtre -> Tiling ???)))
  const navigation:typeof Navigation = await require('./modules/Navigation')
  await navigation.run(browser)
  //let ayy = require('./modules/Manual');
  //await ayy.run(browser);
  //@TODO Finsh Stock module
  //@TODO Finish Assign Module
  //@TODO Import and run chosen module
  //@TODO "Stage" module
  //      Prompt {type:list, separator:' ',
  //      message:'Numéros, séparés par un espace Ex. RTSC014001 14002'}
  //@IDEA Entrer liste machines (0123 0124 0125) puis liste user (natale smith xxx) -> si unique toutes les machines sont assignées à la personne; idem pour le reste des inputs
  //@IDEA ajouter dans module manual??? trop lourd???
  //@TODO "Confirmations" module
  //      Prompt {type:autocomplete} -> Prompt {type:confirm (confirm avec 3 choix ???), message: "Valider ?, echec, annuler"} OU (plus lent) Si 'n' Prompt {type:confirm, message: "Mettre en échec ?"}
  //@TODO "Profile" module
  //      View/change attributes of Hardware, SR and Persons
  //await page.screenshot({ path: 'example.png' });
  await browser.close();
})();



