import { CommandInteraction, GuildMember } from 'discord.js'
import areDmsEnabled from '../utils/areDmsEnabled.js'
import { GuildInterface } from '../struct/Guild.js'

async function sendDm(
    member: GuildMember,
    guildData: GuildInterface,
    i: CommandInteraction,
    reply: string,
    title: string = 'Build reviewed',
) {
    // after updating db, send dm (does this for edits and initial reviews)
    // send dm if user has it enabled
    const dmsEnabled = await areDmsEnabled(member.id)
    if (dmsEnabled && member) {
        const dm = await member.createDM()
        await dm
            .send({
                embeds: [
                    {
                        title: `${guildData.emoji} ${title}! ${guildData.emoji}`,
                        description: `You ${reply}`,
                        footer: {
                            text: `Use the cmd '/preferences' to toggle build review DMs.`
                        }
                    }
                ]
            })
            .catch((err) => {
                console.log(err)
                i.followUp(
                    `\`${member.user.username}#${member.user.discriminator}\` has dms turned off or something went wrong while sending the dm! ${err}`
                )
            })
    }
}

export { sendDm }
