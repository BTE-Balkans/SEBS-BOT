import Builder, { BuilderInterface } from '../struct/Builder.js'

/**
 * check db to see whether user has review dms enabled or not
 */
async function areDmsEnabled(userId: string, guildId: string) {
    const userData: BuilderInterface = await Builder.findOne({ id: userId, guildId:  guildId}).lean()
    return userData.dm
}

export default areDmsEnabled
