import { Browser, DEFAULT_INTERCEPT_RESOLUTION_PRIORITY, ElementHandle, Page } from "puppeteer";
import { Choice, Prompt, PromptOptions, PromptTypes } from "../types/prompt";
import { Argument, IDictionary, IModule } from "../types/IModule";
import { prompts, puppeteer } from "..";
import { Console } from "console";
import { LAYOUT_TYPES, ServicePortal, Selectors, INPUT_TYPES } from "../API/ServicePortal";
import { type } from "os";
import { Misc } from "../API/misc";
import { URLs } from "../const/URLs";
import { PromptFields } from "../const/PromptFIelds";

class Manual implements IModule {
    name = "Navigation textuelle"
    description = "Permet de naviguer le ServicePortal de façon textuelle";
    PromptsTemplate = {
        SELECT_TILE: {
            type: PromptTypes.autocomplete,
            name: PromptFields.TILES,
            message: "Sélectionner la tuile",
            suggest: ServicePortal.SuggestFullTextSpaceSeparatedExactMatch //Recherche personnalisée via le paramètre suggest
        }
    }

    browser?: Browser;
    page?: Page;
    async run(browser: Browser, page?: Page): Promise<void> {
        let stepCounter = 0,
            canceled: boolean
        const options: PromptOptions = { onCancel: () => canceled = true }

        if (!page)
            page = await ServicePortal.Open(browser) as Page
        else if(!ServicePortal.IsHomepage(page))
            await ServicePortal.Open(page)

        do {
            await Misc.sleep(500) //L'icône de chargement n'apparaît pas tout de suite, on attends 500ms pour lui laisser le temps d'apparaitre @TODO trouver quelque chose de plus solide ?
            if (await Misc.ElementExists(page, Selectors.IS_LOADING))//Les tiles sont lazy-loadée, si on trouve l'icône de chargement on attends sa disparition
                await Misc.WaitForSelectorHidden(page, Selectors.IS_LOADING)

            let layoutType = await ServicePortal.GetLayoutType(page) //@TODO Implémenter le layout de la page "Installer" du Windows Store;Le layout est aussi utilisé pour les confirmations
                                                                    //@TODO Implémenter layout "Tableau" (Page commande, confirmations)
            canceled = false
            switch (layoutType) {
                case LAYOUT_TYPES.Tiles:
                    let tiles = await ServicePortal.GetAllTiles(page)
                    if (!tiles)
                        throw new Error("Pas réussi à récupérer les tiles");
                    (this.PromptsTemplate.SELECT_TILE as any).choices = await ServicePortal.GetChoicesFromTiles(page, tiles)
                    let userChoice: { [index: string]: string } = await prompts(this.PromptsTemplate.SELECT_TILE, options)
                    if (canceled) {
                        return //@TODO voir quoi faire
                    }
                    await Misc.ClickAndWaitForNetworkIdle(page, userChoice[PromptFields.TILES])
                    break;

                case LAYOUT_TYPES.Form:
                    if (!await ServicePortal.FillForm(page, stepCounter)) { //@TODO IMPORTANT Tester la refactorisation
                        return await this.run(browser, page) //@TODO voir quoi faire quand l'utilisateur cancel dans une form ? retour aux tuiles ?
                    }
                    const result = await ServicePortal.GoToFormNextStep(page, stepCounter)
                    if (typeof result === "string")
                        console.log("Créé ServiceRequest " + result)
                    break;

                default:
                    break;
            }
            stepCounter++
        } while (!ServicePortal.IsHomepage(page))
        return await this.run(browser, page) //On revient au début du module
    }
}

export = new Manual()