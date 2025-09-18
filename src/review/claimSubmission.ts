import { CommandInteraction, Guild, User } from "discord.js";
import Submission, { SubmissionInterface } from "../struct/Submission.js";
import Responses from "../utils/responses.js";
import Builder from "../struct/Builder.js";
import { insertBuilder } from "./insertBuilder.js";
import { GuildInterface } from "../struct/Guild.js";

/**
 * Add submission to db to claim it
 * @param claimer name of claimer to send in the claim embed
 * @param submissionId The id of the submission 
 * @param i the review command interaction
 * @param guildData Guild data
 */
async function claimSubmission(
    claimer: User,
    submissionId: string,
    i: CommandInteraction,
    guildData: GuildInterface
) {
    try {
        // claim submission
        await Submission.updateOne({id: submissionId, guildId: i.guildId}, {$set: { 'reviewer': claimer.id }})

        return Responses.embed(i, `**Submission successfully claimed by ${claimer}.**`, guildData.accentColor)

    } catch(err) {
        console.log(err)
        return Responses.errorGeneric(i, err, guildData.accentColor)
    }
}

export { claimSubmission}