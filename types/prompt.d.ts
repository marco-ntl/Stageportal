export type Prompt = {
    type: PromptTypes /*| PromptCallback*/,
    name: String /*| PromptCallback*/,
    message: String /*| PromptCallback*/,
    validate?: (value:string) => string | boolean
    initial?: String | Promise<string> /*| PromptCallback | */
    format?: /*PromptCallback |*/ Promise<string>,
    //onRender?: PromptCallback
    //onState?: PromptCallback
    stdin?: ReadableStream
    stdout?: WritableStream
    choices?:Choice[] | void[]

  }

/*export interface PromptCallback {
    previous:string,
    values:{[key in PromptFields]?:string},
    prompt:object
}*/

export enum PromptTypes {
    text = 'text',
    number = 'number',
    password =  'password',
    invisible = 'invisible',
    confirm = 'confirm',
    list = 'list',
    toggle = 'toggle',
    select = 'select',
    multiSelect = 'multiselect',
    autocompleteMultiselect = 'autocompleteMultiselect',
    autocomplete = 'autocomplete',
    date = 'date',
}

export type Choice = {
    title:string,
    value?:string|number|object
}