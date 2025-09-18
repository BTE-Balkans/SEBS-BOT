import { CommandArg } from "../struct/Command.js";

const plotArgs: CommandArg[] = [
    {
        name: 'plotid',
        description: 'ID of the message to the plot',
        required: true,
        optionType: 'string'
    }
]

export { plotArgs }