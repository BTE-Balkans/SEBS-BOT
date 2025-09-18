import Command from '../struct/Command.js'
import Submission, { BuildSize, SubmissionInterface, SubmissionType } from '../struct/Submission.js'
import { globalArgs, landArgs, manyArgs, oneArgs, roadArgs } from '../review/options.js'
import { checkForRankup } from '../review/checkForRankup.js'
import { GuildMember, Message, TextChannel } from 'discord.js'
import { checkIfRejected } from '../utils/checkForSubmission.js'
import validateFeedback from '../utils/validateFeedback.js'
import { addReviewToDb } from '../review/addReviewToDb.js'
import { sendDm, sendDmToCollaborators } from '../review/sendDm.js'
import { addCheckmarkReaction } from '../review/addCheckmarkReaction.js'
import { updateReviewerForAcceptance } from '../review/updateReviewer.js'
import Responses from '../utils/responses.js'
import { claimSubmission } from '../review/claimSubmission.js'
import { addReviewingReaction } from '../review/addReviewingReaction.js'
import { parseBuildMessage } from '../utils/parseBuildMessage.js'
import { handleSubmissionMsg, updateSubmissionMsg } from '../review/handleSubmissionMsg.js'
import { getPointsBreakdown } from '../utils/getPointsBreakdown.js'
import { updateCollaborators } from '../utils/updateCollaborators.js'

export default new Command({
    name: 'review',
    description: 'review builds.',
    reviewer: true,
    subCommands: [
        {
            name: 'claim',
            description: 'Claim a submission',
            args: [
                {
                    name: 'submissionid',
                    description: 'Submission msg id',
                    required: true,
                    optionType: 'string'
                }
            ]
        },
        {
            name: 'one',
            description: 'Review one building.',
            args: [...globalArgs.slice(0, 1), ...oneArgs, ...globalArgs.slice(1)]
        },
        {
            name: 'many',
            description: 'Review multiple buildings.',
            args: [...globalArgs.slice(0, 1), ...manyArgs, ...globalArgs.slice(1)]
        },
        {
            name: 'land',
            description: 'Review land.',
            args: [...globalArgs.slice(0, 1), ...landArgs, ...globalArgs.slice(1)]
        },
        {
            name: 'road',
            description: 'Review road',
            args: [...globalArgs.slice(0, 1), ...roadArgs, ...globalArgs.slice(1)]
        }
    ],
    async run(i, client) {
        const subCommand = i.options.getSubcommand()
        const guildData = client.guildsData.get(i.guild.id)
        const options = i.options
        const submitChannel = (await i.guild.channels.fetch(
            guildData.submitChannel
        )) as TextChannel //await client.channels.fetch(guildData.submitChannel)
        const submissionId = await options.getString('submissionid')
        const isEdit = options.getBoolean('edit') || false
        let submissionMsg: Message

        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        } catch (e) {
            return Responses.invalidSubmissionID(i, submissionId, guildData.accentColor)
        }

        //If the submission message is not from the bot, parse it (ex, if the bot was offline)
        if(!submissionMsg.author.bot) {
            let parsed = await handleSubmissionMsg(client, submissionMsg, guildData)
            if(!parsed) 
                return Responses.submissionRejected(i, 'The builders submission message was not formatted correctly', submissionMsg.url, guildData.accentColor)
        }

         //Get the original submission 
        let originalSubmission : SubmissionInterface = await Submission.findOne({id: submissionId, guildId: i.guildId}).lean()

        if (!client.test && originalSubmission.id == i.user.id) {
            return Responses.submissionPermissionDenied(i, guildData.accentColor)
        }

        // Check if it already got declined / purged
        const isRejected = await checkIfRejected(submissionId, i.guildId)

        // Check if it was not yet claimed
        if(originalSubmission.reviewer == null && subCommand != 'claim' && !isRejected) {
            return Responses.submissionNotBeenClaimed(i, guildData.accentColor)
        } else if(originalSubmission.reviewer != null && originalSubmission.reviewer != i.user.id && subCommand != 'claim') {
            const reviewer = await client.users.fetch(originalSubmission.reviewer)
            return Responses.submissionClaimedByAnotherReviewer(i, reviewer, guildData.accentColor)
        } else if (isEdit && originalSubmission.reviewer != null && originalSubmission.feedback == null && !isRejected) {
            return Responses.submissionHasNotBeenReviewed(i, guildData.accentColor)
        } else if (!isEdit && originalSubmission.reviewer != null && originalSubmission.feedback != null) {
            return Responses.submissionHasAlreadyBeenAccepted(i, guildData.accentColor)
        } else if (isRejected) {
            return Responses.submissionHasAlreadyBeenDeclined(i, guildData.accentColor)
        }

        let feedback = null

        if(subCommand != 'claim') {
            feedback = validateFeedback(options.getString('feedback'))
        }

        //If there are any collaborators of type Player, check if they have in the meantime linked their Minecraft username to their Discord account
        if(originalSubmission.collaborators) {
            originalSubmission.collaborators = await updateCollaborators(originalSubmission.collaborators, guildData)
        }

        // set variables shared by all subcommands
        const builderId = originalSubmission.userId
        const bonus = options.getNumber('bonus') || 1
        let pointsTotal: number
        let submissionData: SubmissionInterface = {
            ...originalSubmission,
            bonus: bonus,
            edit: isEdit,
            reviewTime: i.createdTimestamp,
            reviewer: i.user.id,
            feedback: feedback
        }

        // get builder as member using fetch, not from msg.member because that's bad
        let builder: GuildMember
        try {
            builder = await i.guild.members.fetch(builderId)
        } catch (e) {
            builder = null
        }

        // subcommands
        if(subCommand == 'claim') {
            //Check if the submission was already claimed
            if(originalSubmission.reviewer != null) {
                if(originalSubmission.feedback == null) {
                    return Responses.submissionAlreadyClaimed(i, guildData.accentColor)
                } else {
                    return Responses.submissionHasAlreadyBeenAccepted(i, guildData.accentColor)
                }
            } else {
                await claimSubmission(i.user, submissionId, i, guildData)
                await sendDm(builder, guildData, i, `The [submission](${submissionMsg.url}) review has been assigned to ${i.user}. Await review.`, 'Build claimed')
                await sendDmToCollaborators(submissionData, guildData, i, `The review of the [submission](${submissionMsg.url}) you contributed has been assigned to ${i.user}. Await review.`, 'Build claimed')
                await updateSubmissionMsg(client, submissionMsg, submissionData, guildData, i.guild, i.user)
                await addReviewingReaction(submissionMsg)
            }
        } else if (subCommand == 'one') {
            // set sub-command specific variables
            const size = options.getInteger('size')
            const quality = options.getNumber('quality')
            const complexity = options.getNumber('complexity')
            let sizeName = BuildSize[size]
            pointsTotal = (size * quality * complexity * bonus) / submissionData.collaboratorsCount
            submissionData = {
                ...submissionData,
                submissionType: SubmissionType.ONE,
                size: size,
                quality: quality,
                complexity: complexity,
                pointsTotal: pointsTotal,
                buildCount : 1
            }
            let reply = `gained **${pointsTotal} points!!!**
            
            *__Points breakdown:__*\n`

            let pointsBreakdown = getPointsBreakdown(submissionData)
            for(let pointBreakdown of pointsBreakdown)
                reply += `${pointBreakdown.name}: ${pointBreakdown.value} \n`
            
            reply += `Collaborators: ${submissionData.collaboratorsCount}
            [Link](${submissionMsg.url})
            
            __Feedback:__ \`${feedback}\``

            // do review things
            await checkForRankup(builder, guildData, i)
            await addReviewToDb(
                reply,
                submissionData,
                'buildingCount',
                1,
                originalSubmission,
                i,
                guildData
            )
            await checkForRankup(builder, guildData, i)
            await updateReviewerForAcceptance(originalSubmission, submissionData, i)
            await sendDm(builder, guildData, i, reply)
            await sendDmToCollaborators(submissionData, guildData, i, reply)
            await updateSubmissionMsg(client, submissionMsg, submissionData, guildData, i.guild, i.user)
            await addCheckmarkReaction(submissionMsg)
        } else if (subCommand == 'many') {
            const smallAmt = options.getInteger('smallamt')
            const mediumAmt = options.getInteger('mediumamt')
            const largeAmt = options.getInteger('largeamt')
            const quality = options.getNumber('avgquality')
            const complexity = options.getNumber('avgcomplexity')
            pointsTotal =
                ((smallAmt * 2 + mediumAmt * 5 + largeAmt * 10) *
                    quality *
                    complexity *
                    bonus) /
                submissionData.collaboratorsCount

            submissionData = {
                ...submissionData,
                smallAmt: smallAmt,
                mediumAmt: mediumAmt,
                largeAmt: largeAmt,
                quality: quality,
                complexity: complexity,
                submissionType: SubmissionType.MANY,
                pointsTotal: pointsTotal,
                buildCount : smallAmt + mediumAmt + largeAmt
            }
            let reply = `gained **${pointsTotal} points!!!**
            
            *__Points breakdown:__*\n`

            let pointsBreakdown = getPointsBreakdown(submissionData)
            for(let pointBreakdown of pointsBreakdown)
                reply += `${pointBreakdown.name}: ${pointBreakdown.value} \n`

            reply += `[Link](${submissionMsg.url})
            
            __Feedback:__ \`${feedback}\``

            // do review things
            await checkForRankup(builder, guildData, i)
            await addReviewToDb(
                reply,
                submissionData,
                'buildingCount',
                smallAmt + mediumAmt + largeAmt,
                originalSubmission,
                i,
                guildData
            )
            await updateReviewerForAcceptance(originalSubmission, submissionData, i)
            await sendDm(builder, guildData, i, reply)
            await sendDmToCollaborators(submissionData, guildData, i, reply)
            await updateSubmissionMsg(client, submissionMsg, submissionData, guildData, i.guild, i.user)
            await addCheckmarkReaction(submissionMsg)
        } else if (subCommand == 'land') {
            const sqm = options.getNumber('sqm')
            const landtype = options.getInteger('landtype')
            const quality = options.getNumber('quality')
            const complexity = options.getNumber('complexity')
            pointsTotal =
                (sqm * landtype * complexity * quality * bonus) / 100000 / submissionData.collaboratorsCount
            submissionData = {
                ...submissionData,
                sqm: sqm,
                complexity: complexity,
                submissionType: SubmissionType.LAND,
                quality: quality,
                pointsTotal: pointsTotal
            }

            let reply = `gained **${pointsTotal} points!!!**
            
            *__Points breakdown:__*\n`

            let pointsBreakdown = getPointsBreakdown(submissionData)
            for(let pointBreakdown of pointsBreakdown)
                reply += `${pointBreakdown.name}: ${pointBreakdown.value} \n`

            reply += `Collaborators: ${submissionData.collaboratorsCount}
            [Link](${submissionMsg.url})
            
            __Feedback:__ \`${feedback}\``

            // do review things
            await checkForRankup(builder, guildData, i)
            await addReviewToDb(reply, submissionData, 'sqm', sqm, originalSubmission, i, guildData)
            await updateReviewerForAcceptance(originalSubmission, submissionData, i)
            await sendDm(builder, guildData, i, reply)
            await sendDmToCollaborators(submissionData, guildData, i, reply)
            await updateSubmissionMsg(client, submissionMsg, submissionData, guildData, i.guild, i.user)
            await addCheckmarkReaction(submissionMsg)
        } else if (subCommand == 'road') {
            const roadType = options.getNumber('roadtype')
            const roadKMs = options.getNumber('distance')
            const quality = options.getNumber('quality')
            const complexity = options.getNumber('complexity')
            pointsTotal = (roadType * roadKMs * complexity * quality * bonus) / submissionData.collaboratorsCount
            submissionData = {
                ...submissionData,
                roadType: roadType,
                roadKMs: roadKMs,
                complexity: complexity,
                submissionType: SubmissionType.ROAD,
                quality: quality,
                pointsTotal: pointsTotal
            }

            let reply = `gained **${pointsTotal} points!!!**
            
            *__Points breakdown:__*\n`

            let pointsBreakdown = getPointsBreakdown(submissionData)
            for(let pointBreakdown of pointsBreakdown)
                reply += `${pointBreakdown.name}: ${pointBreakdown.value} \n`

            reply += `Collaborators: ${submissionData.collaboratorsCount}
            [Link](${submissionMsg.url})
            
            Feedback: \`${feedback}\``

            // do review things
            await checkForRankup(builder, guildData, i)
            await addReviewToDb(
                reply,
                submissionData,
                'roadKMs',
                roadKMs,
                originalSubmission,
                i,
                guildData
            )
            await updateReviewerForAcceptance(originalSubmission, submissionData, i)
            await sendDm(builder, guildData, i, reply)
            await sendDmToCollaborators(submissionData, guildData, i, reply)
            await updateSubmissionMsg(client, submissionMsg, submissionData, guildData, i.guild, i.user)
            await addCheckmarkReaction(submissionMsg)
        }
    }
})
