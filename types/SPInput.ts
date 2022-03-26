import { ElementHandle } from "puppeteer";
import { Misc } from "../API/misc";
import { INPUT_TYPES, Selectors, ServicePortal } from "../API/ServicePortal";
import { UNIQUE_IDS } from "../const/UniqueIDs";

export class SPInput {
    inputBlock: DOMElem
    innerInput: DOMElem
    secondInnerInput?:DOMElem //Certains inputs (Eg. radio) ont plus deux inner input
    title: string
    type: INPUT_TYPES
    required:boolean


    constructor(inputBlock: DOMElem, innerInput: DOMElem, title: string, type: INPUT_TYPES, required:boolean, secondInnerinput?:DOMElem) {
        this.inputBlock = inputBlock
        this.innerInput = innerInput
        this.title = title
        this.type = type
        this.required = required
        this.secondInnerInput = secondInnerinput
    }

    static async new(inputBlock: ElementHandle, baseID: string): Promise<SPInput | false> {
        const inputID = await Misc.SetElemID(inputBlock, baseID)
        
        const innerInput = await inputBlock.$(Selectors.INNER_INPUT)
        const title = await ServicePortal.GetTitleFromInput(inputBlock)

        if (!innerInput || !title)
            return false
        
        const innerInputID = await Misc.SetElemID(innerInput, inputID.substring(1) + UNIQUE_IDS.INNER_INPUT)
        const type = await ServicePortal.GetInputType(inputBlock)
        const required = await ServicePortal.IsInputRequired(inputBlock)
        let secondInnerInput = undefined
        if(type === INPUT_TYPES.Radio){
            const secondInnerInputBlock = (await inputBlock.$$(Selectors.INNER_INPUT))?.[1]
            if(!secondInnerInputBlock)
                throw new Error("Pas réussi à récupérer la deuxième valeur du radio button")
            const secondInnerInputID = await Misc.SetElemID(secondInnerInputBlock, baseID + 'noVal')
            secondInnerInput = {elem:secondInnerInputBlock, id:secondInnerInputID}
        }

        return new SPInput(
            { elem: inputBlock, id: inputID },
            {elem:innerInput, id:innerInputID}, title, type, required, secondInnerInput)
    }
}

export type DOMElem = {
    elem: ElementHandle,
    id: string
}