import Bot from '../struct/Client.js'
import { Interaction, MessageFlags, ButtonInteraction, ClientUser } from 'discord.js'
import { requestApplicantForm } from '../trial/requestApplicantForm.js'
import { closeApplicantThread } from '../trial/closeApplicantThread.js'
import { openBuilderMinecraftUsernameModal } from '../utils/openBuilderMinecraftUsernameModal.js'
import { openApplicantForm } from '../trial/openApplicantForm.js'
import { assignPlotButton, deletePlotButton, editPlotButton } from '../trial/handlePlotMsg.js'
import getHelperMember from '../utils/getHelperMember.js'
import Responses from '../utils/responses.js'

export default async function execute(client: Bot, interaction: Interaction) {
    if (
        (!client.test && interaction.guild?.id ==  client.guildProductionID) ||
        (client.test && interaction.guild?.id != client.guildProductionID)
    ) {
        if(interaction.isChatInputCommand() && interaction.commandName == 'preferences') {
            const command = client.commands.get(interaction.commandName)
            if (!command) return

            await interaction.deferReply({flags: MessageFlags.Ephemeral})

            command.run(interaction, client)
        } else if(interaction.isButton()) {
            let customId = interaction.customId

            if(customId.startsWith('builder_setmcusername')) {
                return await openBuilderMinecraftUsernameModal(client, interaction)  
            }
        }

        return
    }

    
    
    if (interaction.isChatInputCommand()) {
        if (!interaction.guild) {
            return interaction.reply('Commands must be used in servers.')
        }

        const guildData = client.guildsData.get(interaction.guild.id)
        if (!guildData) return interaction.reply('This server is not registered')

        const command = client.commands.get(interaction.commandName)
        if (!command) return

        try {
            if (command.reviewer == true || command.admin == true || command.helper == true) {
                const member = await interaction.guild.members.fetch(interaction.user.id)
                let hasPerms = false
                
                if(member.roles.cache.has(client.admin))
                    hasPerms = true
                else if(command.reviewer && member.roles.cache.some(role => guildData.reviewerRoles.includes(role.id)))
                    hasPerms = true
                else if(command.helper && member.roles.cache.some(role => guildData.helperRoles.includes(role.id)))
                    hasPerms = true

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
    }else if(interaction.isButton()) {

        if (!interaction.guild && interaction.channelId ) {
            return interaction.reply('Buttons must be used in servers.')
        }

        const guildData = client.guildsData.get(interaction.guild.id)
        if (!guildData) return interaction.reply('This server is not registered')
        
        const customId = interaction.customId

        if(customId == 'plot_assign' || customId == 'plot_edit' || customId == 'plot_delete') {
            //Check if the user is not a helper
            let helper = await getHelperMember(interaction, guildData)
            if(helper == null) {
                await interaction.deferReply()
                return Responses.embed(interaction ,'**You must be a helper to perform this action**', guildData.accentColor)
            }
        }

        switch(customId) {
            case'openapplicationbutton':
                await requestApplicantForm(interaction, client)
                break
            case 'applicationform_continue':
                await openApplicantForm(interaction, client)
                break
            case 'applicant_reopenapplicantion':
                await requestApplicantForm(interaction, client, true)
                break
            case 'applicant_closeapplication':
                await closeApplicantThread(interaction, client)
                break
            case 'plot_assign':
                await assignPlotButton(interaction, client, guildData)
                break
            case 'plot_edit':
                await editPlotButton(interaction, client, guildData)
                break
            case 'plot_delete':
                await deletePlotButton(interaction, client, guildData)
        }

        
    }
}
