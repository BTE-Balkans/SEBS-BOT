import { Message, resolveColor } from "discord.js";
import { GuildInterface } from "../struct/Guild.js";

async function rejectMessage(msg: Message, reason: string, defaultTitle: string, defaultDescription: string, guildData: GuildInterface, time: number, title?: string, deleteOrgMsg: boolean = true) {
    const embed = {
        title: title ? title : defaultTitle,
        description: title ? reason : defaultDescription,
        color: resolveColor(`#${guildData.accentColor}`) 
    }

    const dm = await msg.author.createDM()
    await dm.send({embeds: [embed] }).catch(() => {})

    setTimeout(() => {
        if(deleteOrgMsg)
            msg.delete().catch(() => {})
    }, time)
    
}

export { rejectMessage }