import Bot from './struct/Client.js'
import Submission from './struct/Submission.js'
import Rejection from './struct/Rejection.js'
import mongoose from 'mongoose'
import GuildPlayer from './struct/GuildPlayer.js'
import ReviewerStats from './struct/ReviewerStats.js'
import HelperStats from './struct/HelperStats.js'
import Application from './struct/Application.js'
import Plot from './struct/Plot.js'
import BuilderStats from './struct/BuilderStats.js'

/**
 * standalone script to merge all users and submissions from one team into another
 * to run, modify the mergeFrom, mergeInto, and mergeFromName vars
 */
async function run(purgeFrom) {
    const client = new Bot()
    console.log('Starting purge..')
    await client.loadDatabase()

    // change all old submissions into new submissions
    await Submission.deleteMany(
        { guildId: purgeFrom }
    )

    await Rejection.deleteMany(
        { guildId: purgeFrom }
    )

    await Plot.deleteMany(
        { guildId: purgeFrom }
    )

    await GuildPlayer.deleteMany(
        { guildId: purgeFrom }
    )

    await ReviewerStats.deleteMany(
        { guildId: purgeFrom }
    )

    await HelperStats.deleteMany(
        { guildId: purgeFrom }
    )

    await BuilderStats.deleteMany(
        { guildId: purgeFrom }
    )

    await Application.deleteMany(
        { guildId: purgeFrom }
    )


    console.log('Finished')

    await mongoose.disconnect()
    client.destroy()
}


run(process.argv[2])
