import { Message, MessageReaction } from 'discord.js'

/**
 * Removes the reactions and adds a 🚧 reaction to the message
 * @param submissionMsg The message to clear and add the reaction
 */
async function addPlotClaimedReaction(submissionMsg: Message) {
    // Remove all bot reactions, then add a '🚧' reaction
    submissionMsg.reactions.cache.forEach((reaction: MessageReaction) => reaction.remove())
    await submissionMsg.react('🚧')
}

export { addPlotClaimedReaction }