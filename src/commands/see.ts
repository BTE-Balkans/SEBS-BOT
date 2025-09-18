import Command from '../struct/Command.js'
import Submission, { BuildSize, SubmissionInterface, SubmissionType } from '../struct/Submission.js'
import Rejection, { RejectionInterface } from '../struct/Rejection.js'
import { Message, TextChannel } from 'discord.js'
import { checkIfRejected } from '../utils/checkForSubmission.js'
import Responses from '../utils/responses.js'
import { getPointsBreakdown } from '../utils/getPointsBreakdown.js'

export default new Command({
    name: 'see',
    description: 'SEE the review summary of a submission.',
    args: [
        {
            name: 'id',
            description: `message id of the submission`,
            required: true,
            optionType: 'string'
        }
    ],
    async run(i, client) {
        const options = i.options
        const guildData = client.guildsData.get(i.guild.id)
        const submitChannel = (await i.guild.channels.fetch(
            guildData.submitChannel
        )) as TextChannel
        const submissionId = options.getString('id')
        let submissionMsg: Message
        let summary: string
        let submissionLink = '[Link could not be generated]'

        // make sure user knows how to use msg ids
        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
            submissionLink = `[Link](${submissionMsg.url})`
        } catch (e) {
        }

        // get submission from db
        const submissionData: SubmissionInterface = await Submission.findOne({id: submissionId, guildId: i.guildId}).exec()

        // check if submission got rejected
        const isRejected = await checkIfRejected(submissionId, i.guildId)

        // return if submission is unreviewed (doesn't exist in rejections or submissions db)
        if (!submissionData && !isRejected) {
            return i.editReply(`This submission has not been reviewed yet.`)
        }

        let sizeName = BuildSize[submissionData.size]

        // if its rejection, get rejection from db
        if (isRejected) {
            const rejectionData: RejectionInterface = await Rejection.findById(submissionId).exec()

            return Responses.embed(i, `That submission was rejected. \n\nFeedback: \`${rejectionData.feedback}\``, guildData.accentColor)
        }

        summary = `This submission earned **${submissionData.pointsTotal} points!!!**\n
        Builder: <@${submissionData.userId}>
        *__Points breakdown:__*\n`

        // otherwise, it's a reviewed submission
        // write the summary depending on which type of submission it was
        let pointsBreakdown = getPointsBreakdown(submissionData)
        for(let pointBreakdown of pointsBreakdown)
            summary += `${pointBreakdown.name}: ${pointBreakdown.value} \n`

        summary += `Collaborators: ${submissionData.collaboratorsCount}
        ${submissionLink}
        __Feedback:__ \`${submissionData.feedback}\``

        // send the review summary
        return i.editReply({
            embeds: [{
                title: 'Points',
                description: summary}]
        })
    }
})
