import { GuildMember, resolveColor } from "discord.js";
import { GuildInterface } from "../struct/Guild.js";

/**
 * Sends an dm (embed) to the guild member
 * @param user The guild member
 * @param guildData The guild data
 * @param reply The description of the embed
 * @param title The title of te embed
 */
async function sendDm(user: GuildMember, guildData: GuildInterface, reply: string, title: string) {
    if(user) {
        const dm = await user.createDM()
        await dm.send({
            embeds: [{
                title: `${guildData.emoji} | ${title}!`,
                description: reply,
                color: resolveColor(`#${guildData.accentColor}`)
            }]
        }).catch((err) => {
            console.log(err)
        })
    }
}

export { sendDm }