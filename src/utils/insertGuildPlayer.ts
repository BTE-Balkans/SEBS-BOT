import { GuildMember } from "discord.js"
import { GuildInterface, SystemRole } from "../struct/Guild.js"
import GuildPlayer, { GuildPlayerInterface } from "../struct/GuildPlayer.js"
import { getBuilderRankFromRoles } from "../utils/getBuilderRankFromRoles.js"

/**
 * Insert a guild player with the given role type, if not yet added
 * @param user Guild member of user
 * @param guildData Guild data
 * @param roleType Role type to insert for the guild player
 * @param rank Rank of the guild player
 * @returns Promise resolving to the inserted guild player
 */
async function insertGuildPlayer(user: GuildMember, guildData: GuildInterface, roleType: SystemRole, rank?: number) : Promise<GuildPlayerInterface>{
    if(!rank)
        rank = getBuilderRankFromRoles(user, guildData)
    
    //If the user doesn't have a builder role and the attended system role was a builder one, set their role to applicant
    //This is done so that under no circumstances a user with no builder roles gets accepted as builder
    if(rank == -1 && roleType == SystemRole.Builder)
        roleType = SystemRole.Applicant 
    return await GuildPlayer.findOneAndUpdate({id: user.id, guildId: guildData.id}, { '$addToSet': { 'roles': roleType }, '$set': { 'rank' : rank } }, { upsert: true }).lean()
}

export default insertGuildPlayer