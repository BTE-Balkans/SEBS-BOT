import { Client, Collection, IntentsBitField } from 'discord.js'
import fs from 'fs'
import mongoose from 'mongoose'
import path, { dirname } from 'path'
import config from '../../config.js'
import Command from './Command.js'
import Guild, { GuildInterface } from './Guild.js'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

class Bot extends Client {
    test: boolean
    commands: Collection<string, Command>
    guildsData: Collection<string, GuildInterface>
    admin: string

    constructor() {
        super({
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMembers,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.GuildMessageReactions,
                IntentsBitField.Flags.DirectMessages
            ]
        })
        this.test = config.test
        this.commands = new Collection()
        this.guildsData = new Collection()
        this.admin = config.admin
    }

    async loadDatabase() {
        mongoose.set('strictQuery', true)
        await mongoose.connect(config.mongoURI)
    }

    async loadGuilds() {
        const guilds: GuildInterface[] = await Guild.find({}).lean()
        guilds.forEach((guild) => {
            this.guildsData.set(guild.id, guild)
        })
    }

    async loadCommands() {
        const commands = fs.readdirSync(path.resolve(__dirname, '../commands'))
        commands.forEach(async (cmd) => {
            const commandImport = await import(`../commands/${cmd.replace('.ts', '.js')}`)
            const command = commandImport.default
            this.commands.set(command.name, command)
        })
    }

    async loadEvents() {
        const events = fs.readdirSync(path.resolve(__dirname, '../events'))
        events.forEach(async (file) => {
            const event = await import(`../events/${file.replace('.ts', '.js')}`)
            super.on(file.split('.')[0], (...args) => event.default(this, ...args))
        })
    }
}

export default Bot
