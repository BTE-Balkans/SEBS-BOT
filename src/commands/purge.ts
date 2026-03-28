import Command from '../struct/Command.js'
import { Message, TextChannel } from 'discord.js'
import Submission, { ParticipantType } from '../struct/Submission.js'
import Builder from '../struct/Builder.js'
import areDmsEnabled from '../utils/areDmsEnabled.js'
import { updateReviewerForPurge } from '../review/updateReviewer.js'
import Rejection from '../struct/Rejection.js'
import Responses from '../utils/responses.js'
import { updateBuildersForPurge } from '../review/updateBuilder.js'
import { globalArgs } from '../review/options.js'

export default new Command({
    name: 'purge',
    description: 'Remove a submission that has already been accepted',
    reviewer: true,
    args: [
        globalArgs[0]
    ],
    async run(i, client) {
        const options = i.options
        const guildData = client.guildsData.get(i.guild.id)
        const submissionId = options.getString('submissionid')
        const submitChannel = (await client.channels.fetch(guildData.submitChannel)) as TextChannel

        let submissionMsg: Message
        let submissionLink = '(Link could not be generated)'

        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
            submissionLink = `[Link](${submissionMsg.url})`

        } catch (e) {
        }

        let originalSubmission = await Submission.findOne({id: submissionId, guildId: i.guildId})

        // Gate to ensure submission exists
        if (!originalSubmission) {
            const rejectedSubmission = await Rejection.findById(submissionId).exec()
            if (rejectedSubmission) {
                return Responses.submissionHasAlreadyBeenDeclined(i, guildData.accentColor)
            }

            return Responses.submissionNotFound(i, guildData.accentColor)
        }

        // Delete submission from the database
        await originalSubmission.deleteOne().catch((err) => {
            console.log(err)
            return Responses.errorGeneric(i, err, guildData.accentColor)
        })

        // Update user's and collaborators points
        await updateBuildersForPurge(originalSubmission)

        // Remove all bot reactions, then add a '❌' reaction
        if (submissionMsg) {
            submissionMsg.reactions.cache.forEach((reaction) => reaction.remove())
            await submissionMsg.react('❌')
        }

        //ToDo: Update submissionMsg to mark it as rejected

        // update reviewer
        await updateReviewerForPurge(originalSubmission)

        const dmsEnabled = await areDmsEnabled(originalSubmission.userId, guildData.id)

        // Send a DM to the user if user wants dms
        try {
            if (dmsEnabled) {
                const builder = submissionMsg.author
                const dm = await builder.createDM()

                await dm.send({embeds: [Responses.createEmbed(
                    `__${submissionLink}__`,
                    guildData.accentColor,
                    `Your recent build submission has been removed.`
                 ).toJSON()
                ]}).catch((err) => {
                    return Responses.errorDirectMessaging(i, err, guildData.accentColor)
                })
            }
        } catch (e) {
        }


        await Responses.submissionPurged(i, submissionLink, guildData.accentColor)
    }
})
