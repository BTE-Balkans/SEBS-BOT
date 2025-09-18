import { setServers } from 'node:dns/promises'
import Bot from './struct/Client.js'
import config from '../config.js'

//FIX querySrv ECONNREFUSED error in mongoose
//https://alexbevi.com/blog/2023/11/13/querysrv-errors-when-connecting-to-mongodb-atlas/
setServers(["1.1.1.1", "8.8.8.8"])

async function start() {
    const client = new Bot()
    console.log('SEBS Bot Starting..')
    await client.login(config.token)
    await client.loadCommands()
    await client.loadEvents()
    await client.loadDatabase()
    await client.loadGuilds()
    console.log('SEBS Bot Started')
}

start()
