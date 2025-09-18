import { CommandInteraction } from 'discord.js'
import Submission, { ParticipantType, SubmissionInterface, SubmissionType } from '../struct/Submission.js'
import Builder from '../struct/Builder.js'
import Responses from '../utils/responses.js'
import { GuildInterface } from '../struct/Guild.js'
import { updateBuildersForPurge } from './updateBuilder.js'
import { updateReviewerForPurge } from './updateReviewer.js'
import { purgeSubmissionStats } from './purgeSubmissionStats.js'

// review function used by all subcommands
/**
 * add review to db, whether edit or initial review
 * @param reviewMsg msg to send in the review embed
 * @param submissionData
 * @param countType buildingCount/roadKMs/sqm
 * @param countValue the amount of buildings/roadKMs/sqms
 * @param originalSubmission the og submission doc if edited, or null if initial review
 * @param i the review command interaction
 * @param guildData the data of the guild
 * @returns
 */
async function addReviewToDb(
    reviewMsg: string,
    submissionData: SubmissionInterface,
    countType: string,
    countValue: number,
    originalSubmission: SubmissionInterface | null,
    i: CommandInteraction,
    guildData: GuildInterface
) {
    let submissionTypeChanged = false

    // If edits changes the submission type, ignore the original submission stats, and only included the new count type,
    // as the original submission stats get purged from the builder points and reviewer 
    // and the original submission stats for the original submission type get reset
    if (
        submissionData.edit &&
        originalSubmission &&
        originalSubmission.submissionType !== submissionData.submissionType
    ) {
        //First the builders points for it must be purged, as well the stats for the reviewer updated
        await updateBuildersForPurge(originalSubmission)
        await updateReviewerForPurge(originalSubmission)

        //Now depending on the type of the org sub type, It's stats must be rest
        purgeSubmissionStats(originalSubmission, originalSubmission.submissionType)
        //The stats of the original type must be purged from the new submission data, 
        // as the base of the new submission data is the original submission data
        purgeSubmissionStats(submissionData, originalSubmission.submissionType)
        //Now purge the status from the db
        await Submission.updateOne({id: originalSubmission.id, guildId: originalSubmission.guildId}, originalSubmission)
        submissionTypeChanged = true
    }

    try {
        //Update submission doc
        await Submission.updateOne({ id: submissionData.id, guildId: i.guildId }, submissionData).exec()

        // update builder doc
        if (submissionData.edit && originalSubmission && originalSubmission.feedback != null) {
            // for edits ----------------------------------------------------
            // get change from original submission, update user's total points and the countType field
            const pointsIncrement = !submissionTypeChanged ? submissionData.pointsTotal - originalSubmission.pointsTotal : submissionData.pointsTotal
            const countTypeIncrement = (() => {
                // If editing a submission with multiple buildings, get change in user's buildingCount from the submission's building counts, which are broken down by building size
                if (submissionData.submissionType === SubmissionType.MANY) {

                    return !submissionTypeChanged ? (
                        countValue -
                        ((originalSubmission.smallAmt || 0) +
                            (originalSubmission.mediumAmt || 0) +
                            (originalSubmission.largeAmt || 0))
                    ) : countValue
                }
                // If editing a single building, there's no need to change the buildingCount
                else if (submissionData.submissionType === SubmissionType.ONE ) {
                    return 0
                } else {
                    return !submissionTypeChanged ? countValue - originalSubmission[countType] : countValue
                }
            })()

            // update the builders doc, adding/subtracting points and building/road/sqm count

            //First update the org builder stats
            await Builder.updateOne(
                { id: submissionData.userId, guildId: i.guild.id },
                {
                    $inc: {
                        pointsTotal: pointsIncrement,
                        [countType]: countTypeIncrement,
                        soloBuilds: -1
                    }
                }
            ).exec()

            //Then update the contributors builders stats
            if(submissionData.collaborators) {
                for(let collaborator of submissionData.collaborators) {
                    if(collaborator.type == ParticipantType.Member) {
                        await Builder.updateOne(
                            { id: submissionData.userId, guildId: i.guild.id },
                            {
                                $inc: {
                                    pointsTotal: pointsIncrement,
                                    [countType]: countTypeIncrement,
                                    contributions: -1
                                }
                            }
                        ).exec()
                    }
                }
            }

            // confirmation msg
            return Responses.embed(
                i,
                `The submission has been edited. 
                
                Builder has ${reviewMsg}`,
                guildData.accentColor
            )
        } else {
            // for initial reviews ------------------------------------------
            // increment user's total points and building count/sqm/roadKMs
            await Builder.updateOne(
                { id: submissionData.userId, guildId: i.guild.id },
                {
                    $inc: {
                        pointsTotal: submissionData.pointsTotal,
                        [countType]: countValue,
                        soloBuilds: 1
                    }
                }
            ).exec()

            //And do the same for the collaborators
            if(submissionData.collaborators) {
                for(let collaborator of submissionData.collaborators) {
                    if(collaborator.type == ParticipantType.Member) {
                        await Builder.updateOne(
                            { id: submissionData.userId, guildId: i.guild.id },
                            {
                                $inc: {
                                    pointsTotal: submissionData.pointsTotal,
                                    [countType]: countValue,
                                    contributions: 1
                                }
                            }
                        ).exec()
                    }
                }
            }

            // confirmation msg
            return Responses.embed(
                i,
                `The submission has been successfully reviewed.
                
                Builder has ${reviewMsg}`,
                guildData.accentColor
            )
        }
    } catch (err) {
        console.log(err)
        return Responses.errorGeneric(i, err, guildData.accentColor)
    }
}

export { addReviewToDb }
