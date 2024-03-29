import { table } from "console";
import path from "path";
import { Browser, ElementHandle, Page } from "puppeteer";
import DB, { Tables } from "./API/db";
import Navigation from "./modules/Navigation";
import { Tile } from "./tables/Tile";
import { HomeTileIdentifiers } from "./const/HomeTileIdentifiers";
import { IModule } from "./types/IModule";
import { Prompt, PromptTypes } from './types/prompt'

export const puppeteer = require('puppeteer');
export const prompts = require('prompts');

/*const isPkg = typeof (process as any).pkg !== 'undefined'
const chromiumExecutablePath = (isPkg //Nécessaire au packaging. Voir https://github.com/vercel/pkg/issues/204#issuecomment-363219758
  ? puppeteer.executablePath().replace(
      /^.*?\/node_modules\/puppeteer\/\.local-chromium/,
      'chromium'
    )
  : puppeteer.executablePath()

)*/
(async () => {
  //Headless -> Est-ce que la fenêtre Chrome devrait être cachée
  //Doit-être set à False, car sinon aucune des tuiles du serviceportal ne sont chargées
  const browser: Browser = await puppeteer.launch({ headless: false, userDataDir: "./browserData"/*, executablePath:chromiumExecutablePath*/ });
  //@IDEA Ouvrir module en REPL (While(!true){module.run()}) dans une nouvelle fenêtre -> Tiling ???)))
  /*const stockTile: Tile = { Guid: '560e4e60-23c0-4fd9-139f-ca2b4d63a679', Identifier: HomeTileIdentifiers.Stock }
  if (!await DB.TableExists(Tables.Tiles)) //Sera dans "OpenTiles"
    await DB.CreateTilesTable()*/

  const navigation: typeof Navigation = await require('./modules/Navigation')
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



