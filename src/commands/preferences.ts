import Command from '../struct/Command.js'
import GuildPlayer from '../struct/GuildPlayer.js'
import MinecraftPlayer from '../struct/MinecraftPlayer.js'
import Responses from '../utils/responses.js'

export default new Command({
    name: 'preferences',
    description: 'Set user preferences.',
    subCommands: [
        {
            name: 'dm',
            description: 'Enable/disable build review DMs.',
            args: [
                {
                    name: 'enabled',
                    description: 'Enable/disable build review DMs.',
                    required: true,
                    optionType: 'boolean'
                }
            ]
        }, 
        {
            name: 'mcusername',
            description: 'Set the Minecraft username',
            args: [
                {
                    name: `username`,
                    description: 'Your Minecraft username',
                    required: true,
                    optionType: 'string'
                }
            ]
        }
    ],
    async run(i, client) {
        const guildData = client.guildsData.get(i.guildId)

        if (i.options.getSubcommand() == 'dm') {
            const toggle = i.options.getBoolean('enabled')
            const userId = i.user.id

            await GuildPlayer.updateMany({ id: userId, guildId: i.guildId }, { dm: toggle }, { upsert:  true }).exec()

            return Responses.dmPreferenceUpdated(i, toggle, guildData.accentColor)
        }
        else if(i.options.getSubcommand() == 'mcusername') {
            const mcUsername = i.options.getString('username')
            await MinecraftPlayer.updateMany({ id: i.user.id }, { 'mcUsername': mcUsername }, { upsert: true })

            return Responses.minecraftUsernameUpdated(i, mcUsername, guildData, guildData.accentColor)
        }
    }
})
