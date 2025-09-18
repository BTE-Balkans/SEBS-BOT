import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Interaction, MessageFlags, TextChannel } from "discord.js";
import Bot from "../struct/Client.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import Responses from "../utils/responses.js";
import { getBuilderRankFromRoles } from "../utils/getBuilderRankFromRoles.js";

/**
 * Start the process for the non-builder to become a builder when the user clicks the open application button
 * @param i The button interaction that started the request
 * @param client The bot
 * @param reopenApplicant True if the application is currently closed, else false by default
 * @returns An message containing a continue button, asking the user if they have an legal copy of Minecraft, 
 * else containing what what went wrong, ex. if a users application is already open
 */
async function requestApplicantForm(i: ButtonInteraction, client: Bot, reopenApplicant: boolean = false) {
    await i.deferReply({flags: MessageFlags.Ephemeral})

    //Get guild data
    const guildData = client.guildsData.get(i.guild.id)
    
    //Check if user is already an applicant
    const builder : BuilderInterface = await Builder.findOne({id: i.user.id, guildId: i.guildId}).lean()
    if(builder?.applicantInfo?.threadId && !builder?.applicantInfo?.closed && builder?.rank == -1) {
        if(i.channel.isThread())  
            return Responses.embed(i, '**Builder application already open', guildData.accentColor)
        
        //Get application channel
        const applicantChannel = (await i.guild.channels.cache.get(guildData.applicantChannel)) as TextChannel
        //Get the thread channel
        const applicantThread = await applicantChannel.threads.fetch(builder.applicantInfo.threadId)

        return Responses.embed(i,`**Builder application already open. Head to ${applicantThread}**`, guildData.accentColor)
    } else if(builder?.applicantInfo?.closed && !reopenApplicant && builder?.rank == -1) {
        const reopenButton = new ButtonBuilder()
            .setCustomId('applicant_reopenapplicantion')
            .setLabel('Reopen')
            .setEmoji('🎟️') 
            .setStyle(ButtonStyle.Danger)

        const row = new ActionRowBuilder().addComponents(reopenButton)

        return await i.editReply({embeds: [Responses.createEmbed('**Builder application was closed in the past** \nDo you want to reopen it?', guildData.accentColor).toJSON()], components: [row.toJSON()]})
    }

    //Get guild member from user
    const member = await i.guild.members.fetch(i.user.id)
    //If the member rank is greater than -1, the member already has a builder role
    const hasBuilderRole = getBuilderRankFromRoles(member, guildData) > -1
    //Check if member already has a builder role, is registered as a builder and has their Minecraft username set
    //Else either register them as applicant or as builder if they already have a builder role, but they don't ex their MC username set
    if(hasBuilderRole && builder?.rank != -1 && builder?.mcUsername){
        return Responses.userAlreadyBuilder(i, guildData.accentColor)
    }
    
    
    const continueButton = new ButtonBuilder()
        .setCustomId('applicationform_continue')
        .setLabel('Continue')
        .setStyle(ButtonStyle.Success)

    const buttonRow = new ActionRowBuilder()
        .addComponents([continueButton])

    //Clear the `Reopen application` button from the original message
    if(reopenApplicant &&  !i.ephemeral) {
        await i.message.edit({components: []})
    }

    return i.editReply({embeds: [Responses.createEmbed('**Do you have a legal copy of Minecraft?** \nYou must have a legal copy to continue', guildData.accentColor).toJSON()], components: [buttonRow.toJSON()]})
}

export { requestApplicantForm }