import Bot from '../struct/Client.js'
import { Interaction, MessageFlags } from 'discord.js'

export default async function execute(client: Bot, interaction: Interaction) {
    if (
        (!client.test && interaction.guild?.id == '1205901531044647032') ||
        (client.test && interaction.guild?.id != '1205901531044647032')
    )
        return

    if (!interaction.isChatInputCommand()) return

    if (!interaction.guild) {
        return interaction.reply('Commands must be used in servers.')
    }

    const guildData = client.guildsData.get(interaction.guild.id)
    if (!guildData) return interaction.reply('This server is not registered')

    const command = client.commands.get(interaction.commandName)
    if (!command) return

    try {
        if (command.reviewer == true || command.admin == true) {
            const member = await interaction.guild.members.fetch(interaction.user.id)
            let hasPerms = false
            member.roles.cache.forEach((role) => {
                if((command.admin && client.admin == role.id) || (command.reviewer && guildData.reviewerRoles.includes(role.id))) {
                    hasPerms = true   
                }
            })
            
            if(command.admin && member.roles.cache.has(client.admin)) {
                hasPerms = true
            } else {
                member.roles.cache.some(role => guildData.reviewerRoles.includes(role.id))
                hasPerms = true
            }

            if (!hasPerms) {
                return await interaction.reply(
                    'You do not have permission to use this command.'
                )
            }
        }

        await interaction.deferReply({flags: MessageFlags.Ephemeral}) //{ephemeral: true}

        command.run(interaction, client)
        
    } catch (err) {
        console.log(err)
    }
}
