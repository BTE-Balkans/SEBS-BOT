import { setServers } from 'node:dns/promises'
import Bot from "./struct/Client.js"
import mongoose from "mongoose"
import GuildPlayer from "./struct/GuildPlayer.js"
import { SystemRole } from "./struct/Guild.js"

//FIX querySrv ECONNREFUSED error in mongoose
//https://alexbevi.com/blog/2023/11/13/querysrv-errors-when-connecting-to-mongodb-atlas/
setServers(["1.1.1.1", "8.8.8.8"])

async function test() {
    const client = new Bot()
    console.log('Started test')
    await client.loadDatabase()

    console.log('Test done')

    await mongoose.disconnect()
    client.destroy()
}

test()
