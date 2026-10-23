import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, resolveColor, User } from "discord.js"
import MinecraftPlayer, { MinecraftPlayerInterface } from "../struct/MinecraftPlayer.js"
import { GuildInterface } from "../struct/Guild.js"

/**
 * Confirm builder has a minecraft username set, and if they do, return the builder
 * @param member 
 * @param guildData 
 * @returns 
 */
async function ensureBuilderMinecraftUsername(member: GuildMember, guildData: GuildInterface) : Promise<MinecraftPlayerInterface> {
    //Check if member doesn't have a Minecraft username set
    const minecraftPlayer : MinecraftPlayerInterface = await MinecraftPlayer.findOne({id: member.id}).lean()
    if(minecraftPlayer) {
        if(minecraftPlayer.username)
            return minecraftPlayer
        
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
            description: `Missing Minecraft username for member ${member}**`,
            color: resolveColor(`#${guildData.accentColor}`)
        }], 
        components: [row.toJSON()]
    }).catch((err) => {
        console.log(err)
    })
}

async function getMinecraftProfile(mcUsername: string,  mcUsernameRegex = /^[a-zA-Z0-9_]{3,16}/) {

    if(!mcUsernameRegex.test(mcUsername) || mcUsername.length < 3 || mcUsername.length > 16)
        return { 'error' : 'Invalid username. Length must be between 3 and 16 characters.' }

    let api = await fetch(`https://api.mojang.com/users/profiles/minecraft/${mcUsername}`)
    let res = await api.json()

    //If the response json contain a errorMessage key, builder with given username was not found 
    if(res['errorMessage'])
        return { 'error' : res['errorMessage'] }
    
    return {
        'uuid' : res['id'],
        'name' : res['name']
    }
}

export { ensureBuilderMinecraftUsername, getMinecraftProfile }