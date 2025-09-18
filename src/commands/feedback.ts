import Command from '../struct/Command.js'
import { Message, TextChannel } from 'discord.js'
import validateFeedback from '../utils/validateFeedback.js'
import { checkIfAccepted, checkIfRejected } from '../utils/checkForSubmission.js'
import Responses from '../utils/responses.js'
import { getSubmissionClaimer } from '../review/getSubmissionClaimer.js'

export default new Command({
    name: 'feedback',
    description: 'Send feedback for a submission.',
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
            description: 'feedback (1700 characters max)',
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

        // check if submission has even been reviewed yet
        if (!(await checkIfRejected(submissionId, i.guildId)) && !(await checkIfAccepted(submissionId, i.guildId))) {
            return Responses.submissionHasNotBeenReviewed(i, guildData.accentColor)
        }

        // Check if the interaction user is the reviewer that claimed the submission
        const claimer = await getSubmissionClaimer(submissionMsg.id, i.guildId)
        if(claimer && claimer != i.user.id) {
            const claimerUser = await client.users.fetch(claimer)
            return Responses.submissionClaimedByAnotherReviewer(i, claimerUser, guildData.accentColor)
        }else if(!claimer) {
            return Responses.submissionNotBeenClaimed(i, guildData.accentColor)
        }

        // get builder now that confirmed it's a valid situation
        const builder = await client.users.fetch(submissionMsg.author.id)
        const dm = await builder.createDM()

        dm.send({embeds: [Responses.createEmbed(
            `__[Submission link](${submissionMsg.url})__
            If you want, use this feedback to improve your build so you can resubmit it for more points!
            
            \`${feedback}\``,
            guildData.accentColor,
            `Here is some feedback for how you can improve your recent build submission!`
            ).toJSON()
        ]}).catch((err) => {
            return Responses.errorDirectMessaging(i, err, guildData.accentColor)
        })

        return Responses.feedbackSent(i, feedback, submissionMsg.url, guildData.accentColor)
    }
})
