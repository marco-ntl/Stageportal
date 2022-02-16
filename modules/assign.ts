import { Browser, Page } from "puppeteer";
import { Prompt } from "../types/prompt";
import { Argument, IDictionary, IModule } from "../types/IModule";

/*const ARGUMENT_PC:Argument = {
    name: 'PC',
    description: 'Le(s) numéro(s) de PC (séparés par un espace)',
    required: true,
    example: 'RTSC012345 001234 013543',
    values:undefined
}
const ARGUMENT_USER:Argument = {
    name: 'username',
    description: "L'username du propriétaire",
    required: true,
    example: 'natalema',
    values:undefined
}*/

class Assign implements IModule{
    name = "Assign"
    description = "Correspond à la tuile \"Assign device\"";
    //@TODO Créer prompts pour les différents inputs
    //@IDEA Générer prompt automatiquement à partir de l'input type ? (Select -> Select, tbx with search -> autocomplete with background checking while user is typing ? e.g. RTSC0123 -> Search RTSC0123 and add results)
    promptsTemplate: IDictionary<Prompt | Prompt[]> = {};
    browser?: Browser | undefined;
    page?: Page | undefined;
    run(browser: Browser, page?: Page): void | Promise<void> {
        throw new Error("Method not implemented.");
    }
}

export = new Assign()