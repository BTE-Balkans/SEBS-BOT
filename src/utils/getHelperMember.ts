import { GuildMember, Interaction } from "discord.js"
import { GuildInterface } from "../struct/Guild.js"

/**
 * Return the guild member of the helper from the interaction user if they have an helper role
 * @param i The interaction from which guild to fetch the guild member
 * @param guildData The guild info
 * @returns The guild member if the user is an helper, else null
 */
export default async function getHelperMember(i: Interaction, guildData: GuildInterface) : Promise<GuildMember> {
    let userMember : GuildMember = await i.guild.members.fetch(i.user.id)
    if(userMember.roles.cache.some((role) => guildData.helperRoles.includes(role.id)))
        return userMember
    return null
}