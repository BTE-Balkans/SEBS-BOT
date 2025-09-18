import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, resolveColor, User } from "discord.js"
import Builder, { BuilderInterface } from "../struct/Builder.js"
import { GuildInterface } from "../struct/Guild.js"

/**
 * Confirm builder has a minecraft username set, and if they do, return the builder
 * @param member 
 * @param guildData 
 * @returns 
 */
async function ensureBuilderMinecraftUsername(member: GuildMember, guildData: GuildInterface) : Promise<BuilderInterface> {
    //Check if builder doesn't have a Minecraft username set
    const builder : BuilderInterface = await Builder.findOne({id: member.id, guildId: member.guild.id}).lean()
    if(builder) {
        if(builder.mcUsername)
            return builder
        
        //Send DM to builder, prompting them for their Minecraft username
        await promptBuilderMinecraftUsername(member, guildData)
        
    }

    return null
} 

async function promptBuilderMinecraftUsername(member: GuildMember, guildData: GuildInterface) {
    const setButton = new ButtonBuilder()
            .setCustomId('builder_setmcusername')
            .setLabel('Set Minecraft username')
            .setStyle(ButtonStyle.Primary)
    
    const row = new ActionRowBuilder().addComponents(setButton)

    const dm = await member.createDM()
    await dm.send({
        embeds: [{
            title: `${guildData.emoji} | Missing Builder Info!`,
            description: `Missing Minecraft username for builder ${member}**`,
            color: resolveColor(`#${guildData.accentColor}`)
        }], 
        components: [row.toJSON()]
    }).catch((err) => {
        console.log(err)
    })
}

async function checkMinecraftUsername(mcUsername: string,  mcUsernameRegex = /^[a-zA-Z0-9_]{3,16}/) {

    if(!mcUsernameRegex.test(mcUsername) || mcUsername.length < 3 || mcUsername.length > 16)
        return false

    let api = await fetch(`https://api.mojang.com/users/profiles/minecraft/${mcUsername}`)
    let res = await api.json()

    //If the response json contain a errorMessage key, builder with given username was not found 
    if(res['errorMessage'])
        return false

    return true
}

export { ensureBuilderMinecraftUsername, checkMinecraftUsername }