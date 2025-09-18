// const Rejection = require('../base/Rejection')
import Rejection from '../struct/Rejection.js'
import Command from '../struct/Command.js'
import { Message, TextChannel } from 'discord.js'
import { checkIfAccepted, checkIfRejected } from '../utils/checkForSubmission.js'
import validateFeedback from '../utils/validateFeedback.js'
import { updateReviewerForRejection } from '../review/updateReviewer.js'
import Reviewer from '../struct/Reviewer.js'
import Responses from '../utils/responses.js'
import submissionRejected = Responses.submissionRejected
import { getSubmissionClaimer } from '../review/getSubmissionClaimer.js'
import Submission from '../struct/Submission.js'

export default new Command({
    name: 'decline',
    description: 'Decline a submission.',
    reviewer: true,
    args: [
        {
            name: 'submissionid',
            description: 'Msg id of the submission',
            required: true,
            optionType: 'string'
        },
        {
            name: 'feedback',
            description: 'feedback for submission (1700 chars max)',
            required: true,
            optionType: 'string'
        }
    ],
    async run(i, client) {
        const options = i.options
        const guildData = client.guildsData.get(i.guild.id)
        const submissionId = options.getString('submissionid')
        const feedback = validateFeedback(options.getString('feedback'))
        const submitChannel = (await client.channels.fetch(guildData.submitChannel)) as TextChannel

        let submissionMsg: Message

        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        } catch (e) {
            return Responses.invalidSubmissionID(i, submissionId, guildData.accentColor)
        }

        // Check if it already got graded
        const isAccepted = await checkIfAccepted(submissionMsg.id, i.guildId)
        if (isAccepted) {
            return Responses.submissionHasAlreadyBeenAccepted(i, guildData.accentColor)
        }

        // Check if it already got declined / purged
        const isRejected = await checkIfRejected(submissionMsg.id, i.guildId)
        if (isRejected) {
            return Responses.submissionHasAlreadyBeenDeclined(i, guildData.accentColor)
        }

        // Check if the interaction user is the reviewer that claimed the submission
        const claimer = await getSubmissionClaimer(submissionMsg.id, i.guildId)
        if(claimer && claimer != i.user.id) {
            const claimerUser = await client.users.fetch(claimer)
            return Responses.submissionClaimedByAnotherReviewer(i, claimerUser, guildData.accentColor)
        }else if(!claimer) {
            return Responses.submissionNotBeenClaimed(i, guildData.accentColor)
        }

        // check if reviewer has reviewed yet or not. new reviewers cannot decline as a first review
        // because that breaks all the stats
        let reviewer = await Reviewer.findOne({ id: i.user.id, guildId: i.guild.id }).exec()

        if (!reviewer) {
            await Reviewer.updateOne(
                {
                    id: i.user.id,
                    guildId: i.guild.id
                },
                {
                    $set: {
                        acceptances: 0,
                        rejections: 0,
                        complexityAvg: 0,
                        qualityAvg: 0,
                        feedbackCharsAvg: 0,
                        feedbackWordsAvg: 0,
                        reviews: 0,
                        reviewsWithFeedback: 0
                    }
                },
                { upsert: true }
            )


            reviewer = await Reviewer.findOne({ id: i.user.id, guildId: i.guild.id }).exec()
        }

        let submission = await Submission.findOne({id: submissionMsg.id, guildId: i.guildId})

        // dm builder
        const builderId = submission.userId
        const builder = await client.users.fetch(builderId)
        const dm = await builder.createDM()

        await dm.send({embeds: [Responses.createEmbed(
            `__[Submission link](${submissionMsg.url})__
            Use this feedback to improve your build and resubmit it to gain points!
        
            \`${feedback}\``,
            guildData.accentColor,
            `Your recent build submission needs revision.`,
            ).toJSON()
        ]}).catch((err) => {
            return Responses.errorDirectMessaging(i, err, guildData.accentColor)
        })

        // record rejection in db
        const rejection = new Rejection({
            id: submissionId,
            guildId: i.guild.id,
            userId: builderId,
            submissionTime: submissionMsg.createdTimestamp,
            reviewTime: i.createdTimestamp,
            reviewer: i.user.id,
            feedback: feedback
        })
        await rejection.save()
        await submissionMsg.react('❌')

        // update reviewer
        await updateReviewerForRejection(reviewer, feedback)

        return submissionRejected(i, feedback, submissionMsg.url)
    }
})
