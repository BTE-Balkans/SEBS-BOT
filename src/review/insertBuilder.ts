import { GuildMember } from "discord.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { GuildInterface } from "../struct/Guild.js";
import { getBuilderRankFromRoles } from "../utils/getBuilderRankFromRoles.js";

/**
 * Insert builder if not yet added
 * @param user Guild member of user
 * @param guildData Guild data
 */
async function insertBuilder(user : GuildMember, guildData: GuildInterface) {
    const res = await Builder.updateOne({id: user.id, guildId: guildData.id}, {}, {upsert: true})
    if(res.upsertedId) {
        let rank = getBuilderRankFromRoles(user, guildData)
        await Builder.updateOne({ id: user.id, guildId: guildData.id}, { 
            $set: {
                'rank': rank,
                'dm': true
            }
        }, {upsert: true})
    }
}

export { insertBuilder }