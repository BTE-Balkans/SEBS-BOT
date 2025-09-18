import { GuildMember } from "discord.js";
import { GuildInterface } from "../struct/Guild.js";

/**
 * Get the builder rank from the guild member roles, if they have a builder role, else return -1 (as for applicant)
 * @param user Guild member of user
 * @param guildData Guild data
 * @returns Index of rank from 0 to 4 or -1 if they don't have a builder role yet
 */
function getBuilderRankFromRoles(user: GuildMember, guildData: GuildInterface,) {
    let rank = -1
    //Find if guild member has any builder role, and get It's rank index [0-4]
    //Start from the highest rank, as the guild member may have multiple builder roles
    for(let r = 5; r >= 0; r--) {
        let roleId : string = guildData[`rank${r}`].id
        if(user.roles.cache.some(role => role.id == roleId)) {
            rank = r - 1 //Index goes from 0 to 4, while rank name goes from 1 to 5
            break
        }
    }

    return rank;
}

export { getBuilderRankFromRoles }