import GuildPlayer, { GuildPlayerInterface } from "../struct/GuildPlayer.js"

/**
 * check db to see whether user has review dms enabled or not
 */
async function areDmsEnabled(userId: string, guildId: string) {
    const userData: GuildPlayerInterface = await GuildPlayer.findOne({ id: userId, guildId:  guildId}).lean()
    return userData.dm
}

export default areDmsEnabled
