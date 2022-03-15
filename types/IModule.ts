import { Prompt } from "./prompt";
import { Browser, Page } from "puppeteer";

export interface IModule {
    name:string
    description:string
    helpStr?:string
    promptsTemplate: IDictionary<Prompt | Prompt[]>
    run(browser?:Browser, page?:Page):Promise<any> | void //@TODO Retirer l'argument browser ??
    hidden?:boolean
    moduleType?:CoreModules
    //askForArgs():Argument | Argument[]
    //parseArgs(args:string) -> 
}

export type Argument = {
    name:string,
    values?:string | string[]
    description:string,
    prompt:string,
    required:boolean
}

export type IDictionary<T> = {
    [name:string]:T
}

export enum CoreModules{
    Nav = 'navigation',
    SRGLogin = 'srgLogin',
    Assign = 'assign',
    Manual = 'manual',
    
}