import Command from '../struct/Command.js'
import Discord, { TextChannel } from 'discord.js'
import Submission from '../struct/Submission.js'
import User from '../struct/User.js'
import { checkIfRejected } from '../utils/checkForSubmission.js'
import validateFeedback from '../utils/validateFeedback.js'

export default new Command({
    name: 'purge',
    description: 'Remove a submission that has already been accepted',
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
        const guild = client.guildsData.get(i.guild.id)
        const submissionId = options.getString('submissionid')
        const feedback = validateFeedback(options.getString('feedback'))
        const submitChannel = (await client.channels.fetch(guild.submitChannel)) as TextChannel

        let submissionMsg

        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        } catch (e) {
            return i.reply(
                `'${submissionId}' is not a valid message ID from the build submit channel!`
            )
        }

        // Check if it already got reviewed
        const originalSubmission = await Submission.findOne({
            _id: submissionId
        }).lean()
        if (originalSubmission == null) {
            // Check if it already got declined / purged
            const isRejected = await checkIfRejected(submissionMsg)
            if (isRejected) {
                return i.reply(
                    'that one has already been rejected <:bonk:720758421514878998>!'
                )
            } else {
                return i.reply(
                    'that one hasnt been graded yet <:bonk:720758421514878998>! Use `/decline` instead'
                )
            }
        }

        await i.reply('doing stuff...')

        // Delete submission from the database
        await Submission.deleteOne({
            _id: submissionId
        }).catch((err) => {
            console.log(err)
            return i.followUp(`ERROR HAPPENED: ${err}\n Please try again`)
        })

        // Update user's points
        const pointsIncrement = -originalSubmission.pointsTotal
        const buildingCountIncrement = (() => {
            switch (originalSubmission.submissionType) {
                case 'MANY':
                    return (
                        -originalSubmission.smallAmt -
                        originalSubmission.mediumAmt -
                        originalSubmission.largeAmt
                    )
                case 'ONE':
                    return -1
                default:
                    return 0
            }
        })()
        const roadKMsIncrement = -originalSubmission.roadKMs || 0
        const sqmIncrement = -originalSubmission.sqm || 0
        const userId = submissionMsg.author.id
        await User.updateOne(
            { id: userId, guildId: i.guild.id },
            {
                $inc: {
                    pointsTotal: pointsIncrement,
                    buildingCount: buildingCountIncrement,
                    roadKMs: roadKMsIncrement,
                    sqm: sqmIncrement
                }
            },
            { upsert: true }
        ).lean()

        i.followUp(`PURGED SUBMISSION [Link](${submissionMsg.url})`)

        // Send a DM to the user
        const builder = await client.users.fetch(submissionMsg.author.id)
        const dm = await builder.createDM()

        const embed = new Discord.MessageEmbed()
            .setTitle(`Your recent build submission has been removed.`)
            .setDescription(
                `__[Submission link](${submissionMsg.url})__\n\nYou can use this feedback to improve your build then resubmit it to gain points!\n\n\`${feedback}\``
            )

        await dm.send({ embeds: [embed] }).catch((err) => {
            return i.followUp(
                `${builder} has dms turned off or something went wrong while sending the dm! ${err}`
            )
        })

        // Remove all bot reactions, then add a '❌' reaction
        await submissionMsg.reactions.cache.forEach((reaction) => reaction.remove())
        await submissionMsg.react('❌')
        return i.followUp('removed and feedback sent :weena!: `' + feedback + '`')
    }
})
