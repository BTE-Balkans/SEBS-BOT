import Command from '../struct/Command.js'
import User from '../struct/User.js'
import Submission from '../struct/Submission.js'
import Discord, { TextChannel } from 'discord.js'

export default new Command({
    name: 'die',
    description: 'die',
    reviewer: true,
    args: [
        {
            name: 'submissionid',
            description: 'Msg id of the submission to add complexity to',
            required: true,
            optionType: 'string'
        },
        {
            name: 'complexity',
            description: `Complexity to add`,
            required: true,
            optionType: 'number'
        }
    ],
    async run(i, client) {
        const guildData = client.guildsData.get(i.guild.id)
        const options = i.options
        const complexity = options.getNumber('complexity')
        const submitChannel = (await client.channels.fetch(
            guildData.submitChannel
        )) as TextChannel
        const submissionId = await options.getString('submissionid')
        let submissionMsg

        try {
            // check if the submission msg is valid and already graded
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        } catch (e) {
            return i.reply(
                `'${submissionId}' is not a valid message ID from the build submit channel!`
            )
        }

        const userId = submissionMsg.author.id

        // check if user is in db
        const userData = await User.findOne({
            id: userId,
            guildId: guildData.id
        }).lean()

        if (!userData) {
            return i.reply({
                embeds: [
                    new Discord.MessageEmbed().setDescription(
                        `<@${userId}> has not gained any points yet :frowning2: <:sad_cat:873457028981481473>`
                    )
                ]
            })
        }

        // get change in points from original submission, update user's total points
        const original = await Submission.findOne({
            _id: submissionId
        }).lean()

        // calculate new pointstotal based on previous pointstotal and complexity
        const pointsTotal = (original.pointsTotal / original.complexity) * complexity
        const increment = pointsTotal - original.pointsTotal

        // update submission doc pointstotal and complexity
        await Submission.updateOne(
            { _id: submissionId, guildId: i.guild.id },
            { pointsTotal: pointsTotal, complexity: complexity }
        ).lean()

        // update user doc pointstotal
        await User.updateOne(
            { id: userId, guildId: i.guild.id },
            { $inc: { pointsTotal: increment } },
            { upsert: true }
        ).lean()

        i.reply(
            `ok added ${complexity} complexity to <@${userId}>'s build. [Link](${submissionMsg.url}). DIE!`
        )
    }
})
