import Bot from "./struct/Client.js"
import Helper from "./struct/Helper.js"
import config from "../config.js"
import mongoose from "mongoose"
import { Plot } from "./struct/Plot.js"

async function test() {
    const client = new Bot()
    console.log('Started test')
    await client.loadDatabase()

    //let plots = await Plot.find({builder: "194538217867837440", $or: [ {complete: null}, {complete: false}]})

    //console.log(plots)

    console.log('Test done')

    await mongoose.disconnect()
    client.destroy()
}

test()
