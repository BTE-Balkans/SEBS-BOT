import { isIfStatement } from "typescript";
import { CollaboratorInterface, ParticipantType } from "../struct/Submission.js";
import { GuildInterface } from "../struct/Guild.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";

/**
 * Update the collaborators array if any collaborators of type Player 
 * has linked their Discord account
 * @param collaborators The array of collaborators
 * @param guildData The guild data
 * @returns Updated collaborators if any change was detected, else the original array
 */
async function updateCollaborators(collaborators: CollaboratorInterface[], guildData: GuildInterface) {
    for(let i = 0; i < collaborators.length; i++) {
        let collaborator = collaborators.at(i)
        if(collaborator.type == ParticipantType.Player) {
            let builder : BuilderInterface = await Builder.findOne({guildId: guildData.id, mcUsername: collaborator.value}).lean()
            if(builder) {
                //If a builder was found, change the item type to Member, and the item value to the id of the builder
                collaborator.type = ParticipantType.Member
                collaborator.value = builder.id
                collaborators[i] = collaborator
            }
        }
    }

    return collaborators
}

export { updateCollaborators }