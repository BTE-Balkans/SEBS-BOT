import { StringSelectMenuOptionBuilder } from "discord.js";
import DifficultyEmoji from "./difficultyEmoji.js";
import Difficulty from "../struct/Difficulty.js";

/**
 * Create the options used for a difficulty string select menu
 * @param addDescription Add description '<Difficulty> builder' to each option
 * @param difficulty The optional default difficulty [1-5]
 * @returns A array of StringSelectMenuOptionBuilders
 */
function createDifficultySelectMenuOptions(addDescription = false, difficulty?: number) {
    let options : StringSelectMenuOptionBuilder[] = []

    for(let i = 1; i <= 5; i++) {
        let option = new StringSelectMenuOptionBuilder({label: `${i} - ${Difficulty[i - 1]}`, emoji: DifficultyEmoji.get(i), value: `${i}`})
        if(addDescription)
            option.setDescription(`${Difficulty[i - 1]} builder`)
        if(difficulty && i == difficulty)
            option.setDefault(true)

        options.push(option)
    }

    return options
}

export { createDifficultySelectMenuOptions }