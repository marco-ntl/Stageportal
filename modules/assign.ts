import { Browser, ElementHandle, Page } from "puppeteer";
import { Prompt } from "../types/prompt";
import { Argument, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { ServicePortal } from "../API/ServicePortal";

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
    name = "NON DISPONIBLE Assign"
    description = "Correspond à la tuile \"Assign device\"";
    //@TODO Créer prompts pour les différents inputs
    //NOTE : Un input "hidden" veut dire que l'input suivant est requis
    ///@IDEA L'utilisateur sélectionne la tile au premier lancement, ou si elle n'est pas trouvée
    //@IDEA Entrer liste machines (0123 0124 0125) puis liste user (natale smith xxx) -> si unique toutes les machines sont assignées à la personne; idem pour le reste des inputs
    promptsTemplate = {}; //Machine number -> type:list
    browser?: Browser | undefined;
    page?: Page | undefined;
    hidden:boolean = false
    
    async run(browser: Browser, page?: Page): Promise<void> {
        if(!page)
            page = await ServicePortal.Open(browser)
        else
            await ServicePortal.Open(page)

        
        //@TODO Accéder au formulaire assign device, créer liste des inputs, soumettre SR
        throw new Error("Method not implemented.");
    }
}


export = new Assign()