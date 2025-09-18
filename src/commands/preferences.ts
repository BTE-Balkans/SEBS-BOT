import Command from '../struct/Command.js'
import Builder from '../struct/Builder.js'
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

            await Builder.updateMany({ id: userId }, { dm: toggle }).exec()

            return Responses.dmPreferenceUpdated(i, toggle, guildData.accentColor)
        }
        else if(i.options.getSubcommand() == 'mcusername') {
            const mcUsername = i.options.getString('username')
            await Builder.updateMany({id: i.user.id}, { 'mcUsername': mcUsername})

            return Responses.minecraftUsernameUpdated(i, mcUsername, guildData, guildData.accentColor)
        }
    }
})
