export type Question = {
    type: PromptTypes | PromptCallback,
    name: PromptFields | PromptCallback,
    message: String | PromptCallback,
    validate?: (value:string) => string | boolean
    initial?: String | PromptCallback | Promise<string>
    format?: PromptCallback | Promise<string>,
    onRender?: PromptCallback
    onState?: PromptCallback
    stdin?: ReadableStream
    stdout?: WritableStream
  }

export interface PromptCallback {
    previous:string,
    values:{[key in PromptFields]?:string},
    prompt:object
}

export enum PromptFields {
    username = 'username',
    password = 'pwd',
    otp = 'otp'
}

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