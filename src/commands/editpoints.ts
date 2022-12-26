import Command from '../struct/Command.js'
import User from '../struct/User.js'
import Submission from '../struct/Submission.js'
import Discord, { TextChannel } from 'discord.js'
import { checkIfAccepted } from '../utils/checkForSubmission.js'

export default new Command({
  name: 'cautioneditpoints',
  description:
    'ATTENTION: USE /REVIEW COMMAND FOR REGULAR EDITING, CONSULT WITH OTHER ADMINS BEFORE USING!!!',
  reviewer: true,
  args: [
    {
      name: 'submissionid',
      description: 'Msg id of the submission to add/subtract points from',
      required: true,
      optionType: 'string',
    },
    {
      name: 'amount',
      description: `The number of points to add or subtract (positive or negative value)`,
      required: true,
      optionType: 'number',
    },
  ],
  async run(i, client) {
    const guildData = client.guildsData.get(i.guild.id)
    const options = i.options
    const amount = options.getNumber('amount')
    const submitChannel = (await client.channels.fetch(guildData.submitChannel)) as TextChannel
    const submissionId = await options.getString('submissionid')
    let submissionMsg

    try {
      // check if the submission msg is valid and already graded
      submissionMsg = await submitChannel.messages.fetch(submissionId)
    } catch (e) {
      return i.reply(
        `'${submissionId}' is not a valid message ID from the build submit channel!`,
      )
    }

    // Check if it already got reviewed
    const isAccepted = await checkIfAccepted(submissionId)
    if (!isAccepted) {
      return i.reply(
        'that one hasnt been graded yet <:bonk:720758421514878998>! `/review` it first',
      )
    }

    if (submissionMsg.author.id == i.user.id && i.user.id != '306529453826113539') {
      return i.reply('you cannnot review your own builds <:bonk:720758421514878998>')
    }

    const userId = submissionMsg.author.id

    // update submission doc pointstotal
    await Submission.updateOne(
      { _id: submissionId, guildId: i.guild.id },
      { $inc: { pointsTotal: amount } },
    ).lean()

    // check if user is in db
    const userData = await User.findOne({
      id: userId,
      guildId: guildData.id,
    }).lean()

    if (!userData) {
      return i.reply({
        embeds: [
          new Discord.MessageEmbed().setDescription(
            `<@${userId}> has not gained any points yet :frowning2: <:sad_cat:873457028981481473>`,
          ),
        ],
      })
    }

    // increments user's points by the amount inputted
    await User.updateOne(
      { id: userId, guildId: i.guild.id },
      {
        $inc: {
          pointsTotal: amount,
        },
      },
      { upsert: true },
    ).lean()

    i.reply(
      `ok updated <@${userId}>'s points by ${amount}.\nREMEMBER: USE /REVIEW COMMAND FOR REGULAR SUBMISSION EDITING. THIS IS THE LAST RESORT IF ALL ELSE FAILS. IMMEDIATELY CONSULT ADMINS IF THIS COMMAND WAS USED IN THE WRONG CIRCUMSTANCE`,
    )
  },
})
