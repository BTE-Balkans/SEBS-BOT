import { CommandInteraction, User } from "discord.js";
import Submission, { SubmissionInterface } from "../struct/Submission.js";
import Responses from "../utils/responses.js";
import Builder from "../struct/Builder.js";

/**
 * Add submission to db to claim it
 * @param claimer name of claimer to send in the claim embed
 * @param submissionData 
 * @param i the review command interaction
 */
async function claimSubmission(
    claimer: User,
    submissionData: SubmissionInterface,
    i: CommandInteraction
) {
    try {
        // insert submission into db
        await Submission.updateOne({_id: submissionData._id}, submissionData, {
            upsert: true
        }).exec()

        // insert builder if not yet added
        const res = await Builder.updateOne({ id: submissionData.userId, guildId: i.guild.id}, {}, {upsert: true}).exec()
        if(res.upsertedId){
            await Builder.updateOne({ id: submissionData.userId, guildId: i.guild.id}, { 
                $set: {
                    dm: true
                }
            }, {upsert: true}).exec()
        }

        return i.editReply(Responses.createEmbed(
            `Submission successfully claimed by ${claimer}.`
        ))

    } catch(err) {
        console.log(err)
        return Responses.errorGeneric(i, err)
    }
}

export { claimSubmission}