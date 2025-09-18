import { CommandInteraction, GuildMember, Interaction, resolveColor } from 'discord.js'
import areDmsEnabled from '../utils/areDmsEnabled.js'
import { GuildInterface } from '../struct/Guild.js'
import { ParticipantType, SubmissionInterface } from '../struct/Submission.js'

/**
 * Send a dm to a builder
 * @param member The guild member to send the info to
 * @param guildData The guild data
 * @param i The interaction
 * @param reply The description of the embed
 * @param title The optional title of the embed, else the default 'Build reviewed' is used 
 */
async function sendDm(
    member: GuildMember,
    guildData: GuildInterface,
    i: Interaction,
    reply: string,
    title?: string,
) {
    // after updating db, send dm (does this for edits and initial reviews)
    // send dm if user has it enabled
    const dmsEnabled = await areDmsEnabled(member.id, guildData.id)
    if (dmsEnabled && member) {
        const dm = await member.createDM()
        await dm
            .send({
                embeds: [
                    {
                        title: `${guildData.emoji} | ${!title ? 'Build reviewed' : title}!`,
                        description: !title ? `You ${reply}` : reply,
                        color: resolveColor(`#${guildData.accentColor}`),
                        footer: {
                            text: `Use the cmd '/preferences' to toggle build review DMs.`
                        }
                    }
                ]
            })
            .catch((err) => {
                console.log(err)
                if(i instanceof CommandInteraction)
                    i.followUp(
                        `\`${member.user.username}#${member.user.discriminator}\` has dms turned off or something went wrong while sending the dm! ${err}`
                    )
            })
    }
}

/**
 * Send dm's to collaborators of a submission, if there are any
 * @param submission Info of the submission
 * @param guildData The guild data
 * @param i The interaction
 * @param reply The description of the embed
 * @param title The optional title of the embed, else the default 'Build reviewed' is used
 */
async function sendDmToCollaborators(
    submission: SubmissionInterface, 
    guildData: GuildInterface,
    i: Interaction,
    reply: string,
    title?: string) {
    if(submission.collaborators && submission.collaborators.length > 0) {
        for(let collaborator of submission.collaborators) {
            if(collaborator.type == ParticipantType.Member) {
                try {
                    let member = await i.guild.members.fetch(collaborator.value)
                    await sendDm(member, guildData, i, reply, title)
                }catch(err) {}
            }
        }
    }
}

export { sendDm, sendDmToCollaborators }
