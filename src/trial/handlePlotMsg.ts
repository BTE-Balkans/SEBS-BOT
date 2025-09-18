import { Message, AttachmentBuilder, EmbedBuilder, ContainerBuilder, MessageFlags, ContainerComponent, MediaGalleryComponent, ButtonInteraction, GuildMember, userMention, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, LabelBuilder, ModalBuilder, TextDisplayBuilder, ActionRowBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ButtonBuilder, Interaction, ComponentType, TextInputBuilder, TextInputStyle, TextChannel, resolveColor } from "discord.js";
import Bot from "../struct/Client.js";
import { GuildInterface } from "../struct/Guild.js";
import { parseBuildMessage } from "../utils/parseBuildMessage.js";
import { Plot, PlotInterface } from "../struct/Plot.js";
import { addPlotAddedReaction } from "./addPlotAddedReaction.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { claimPlot, deletePlot } from "./handlePlot.js";
import Responses from "../utils/responses.js";
import getHelperMember from "../utils/getHelperMember.js";
import { downloadAttachment } from "../utils/downloadAttachment.js";
import { rejectMessage } from "../utils/rejectMessage.js";
import { createPlotContainer } from "../utils/createMessageContainers.js";

async function handlePlotMsg(client : Bot, msg : Message, guildData: GuildInterface) {
    const guildMember = await msg.guild.members.fetch(msg.author.id)
    const isHelper = guildMember.roles.cache.some(role => guildData.helperRoles.includes(role.id))

    if(!isHelper) {
        const isAdmin = guildMember.roles.cache.some(role => client.admin == role.id)
        if(!isAdmin) {
            return reject(msg, 'User is not an admin', guildData, '`Missing role`')
        } else {
            return reject(msg, 'User is not a helper', guildData, '`Missing role`')
        }
    }

    //Check that the plot has at least one image attached if client is not test
    if (!client.test && msg.attachments.size === 0 || (msg.attachments.size > 0 && msg.attachments.at(0).contentType.startsWith('image'))) {
        return reject(msg, 'NO REFERENCE IMAGE FOUND', guildData)
    }

    const { 
        error,
        count,
        hasCountLine,
        coords,
        hasCoordsLine,
        address,
        hasAddressLine,
        mapUrl,
        hasUrlLine
    } = await parseBuildMessage(msg, true, false, /^[1-5]/)

    if(error) {
        if(error != '')
            return reject(msg, error, guildData, 'ERROR WHILE PARSING INFO')

        if(hasCountLine)
            return reject(msg,'DIFFICULTY MUST BE BETWEEN 1 AND 5', guildData)

        if(hasCoordsLine)
            return reject(msg, 'INVALID OR UNRECOGNIZED COORDINATES', guildData)

        if(hasAddressLine)
            return reject(msg, 'EMPTY ADDRESS', guildData)

        if(hasUrlLine) {
            return reject(msg, 'INVALID OR UNRECOGNIZED URL', guildData)
        }

        return reject(msg, 'ERROR WHILE PARSING', guildData)
    }

    //Check if the plot exists already
    const res : PlotInterface = await Plot.findOne({ guildId: guildData.id, address: address }).lean()
    if(res)
        return reject(msg, `Plot with this address already exists`, guildData, 'Duplicate data')

    //Download the reference image
    const attachment = msg.attachments.at(0)
    let attachmentImageLink = !client.test ? `attachment://${attachment.name.replace(' ','-')}` : "https://zgodovinanadlani.si/wp-content/uploads/2015/09/82-1_rožna_dolina_rožnik_ljubljana_1922.jpg"
    let refImageFile : AttachmentBuilder
    if(!client.test) {
        try {
            refImageFile = await downloadAttachment(attachment.url, attachment.name)
        }catch(err) {
            return reject(msg,`${err}`, guildData, 'ERROR WHILE DOWNLOADING REFERENCE IMAGE')
        }
    }

    const plotAuthor = await msg.guild.members.fetch(msg.author)
    let plotContainer : ContainerBuilder = createPlotContainer(address, coords, count, attachmentImageLink, mapUrl, plotAuthor, guildData.accentColor)

    if(!msg.channel.isSendable())
        return reject(msg, 'Could not send the to channel', guildData, 'INVALID CHANNEL')

    //Delete the original message
    msg.delete().catch(() => {})
    //Post the plot message with the container
    let newMsg : Message
    try {
        //Attach the ref image if client test is false
        newMsg = !client.test ? 
            await msg.channel.send({components: [plotContainer.toJSON()], files: [refImageFile], flags: MessageFlags.IsComponentsV2}) :
            await msg.channel.send({components: [plotContainer.toJSON()], flags: MessageFlags.IsComponentsV2})
    }catch(err) {
        console.log('[HandlePlotMsgError] ' + err)
        return reject(msg, `Exception: ${err}`, guildData, 'ERROR WHILE CREATING PLOT CONTAINER', false)
    }

    //Get the actual url to the ref image in the embed
    let refPhotoURL = ((newMsg.components[0] as ContainerComponent).components[9] as MediaGalleryComponent).items[0].media.url

    await Plot.updateOne({id: newMsg.id, guildId: guildData.id}, {
        $set: {
            difficulty: count,
            refPhoto: refPhotoURL,
            mapUrl: mapUrl,
            plotter: plotAuthor.id,
            dateAdded: msg.createdTimestamp,
            address: address,
            coords: coords
        }
    }, {upsert: true})
    
    //Add plot added reaction to new msg
    await addPlotAddedReaction(newMsg)
}

async function reject(msg: Message, reason : string, guildData: GuildInterface, title? : string, deleteOrgMsg : boolean = true) {
    await rejectMessage(msg, reason, `INCORRECT PLOT FORMAT: ${reason}`, `**Correct format:**\n[Difficulty level 1-5]\n[Coordinates]\n[Address]\n[Location map link]\n[Reference photo of build]\n\n__The entire plot must be in ONE MESSAGE!`, guildData, 30000, title, deleteOrgMsg)
}

async function assignPlotButton(i: ButtonInteraction, client: Bot, guildData: GuildInterface) {
    await i.deferReply({flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral})

    const accentColor = parseInt(guildData.accentColor, 16)

    //Find the plot through the message id
    let plot : PlotInterface = await Plot.findOne({id: i.message.id, guildId: guildData.id}).lean()
    if(plot) {
        if(plot.builder)
            return Responses.container(i, '**Plot is already assigned to another applicant.**  \nOnly plots marked with 🟢 are free', accentColor)

         const helper = await getHelperMember(i, guildData)
        //Get applicants assigned with helper
        const applicants = (await Builder.find({guildId: guildData.id, rank: -1})).filter((user) => user.applicantInfo?.closed == false && user.applicantInfo?.threadId != null && user.applicantInfo?.helperId == helper.id)
       

        if(applicants.length == 0)
            return Responses.container(i, '**No free applicants available**', accentColor)
        
        //Create the select applicant menu builder
        const selectApplicant = new StringSelectMenuBuilder({custom_id: 'plot_selectapplicant', placeholder: 'Select applicant'})
        for(let applicant of applicants) {
            //Get guild member
            const guildMember = await i.guild.members.fetch(applicant.id)
            if(guildMember) {
                selectApplicant.addOptions(
                    new StringSelectMenuOptionBuilder({label: `${guildMember.displayName} (#${guildMember.user.username})`, value: guildMember.id})
                )
            }
        }
        
        //Create container and show it
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder({content: '**Select applicant to assign plot to**'})
            )
            .addActionRowComponents((rowBuilder) => 
                rowBuilder.addComponents(selectApplicant))
            .setAccentColor(accentColor)

        //let deletedReply = false
        try {
            const newMsg = await i.editReply({components: [container.toJSON()], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral})

            const resp = await newMsg.awaitMessageComponent({
                filter: (interaction) => {  
                    interaction.deferUpdate()
                    return interaction.user.id == helper.id 
                },
                componentType: ComponentType.StringSelect,
                time: 5 * 60 * 1000
            })

            const applicantID = resp.values.join()

            let builder : BuilderInterface = applicants.find((p) => p.id == applicantID).toObject()
            //Claim the plot
            let res = await claimPlot(i, client, plot, builder, helper, guildData, null, i.channel)
            return Responses.container(i, res, accentColor)
        }catch(err) {
            console.log(`[AssignPlotButtonError]: \n > ${err}`)
            return Responses.container(i, `**Assign Plot Error:** \n ${err}`, accentColor)
        }
    } else {
        return Responses.container(i, '**Invalid message, could not find plot for ID**', accentColor)
    }
}

async function editPlotButton(i: ButtonInteraction, client: Bot, guildData: GuildInterface) {
    const accentColor = parseInt(guildData.accentColor, 16)
    try {
        //Get the plot from the message id
        let plot : PlotInterface = await Plot.findOne({id: i.message.id, guildId: guildData.id}).lean()

        //Prevent the other helpers, other then the plot author from editing the plot
        if(i.user.id != plot.plotter)
            return i.reply({components: [Responses.createContainer('**Only the plot author can edit the plot:**', accentColor).toJSON()], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2})

        //Create the modal components
        const modalSubtitle = new TextDisplayBuilder({content: `### Editing plot - ${plot.id}`})

        const addressText = new TextInputBuilder({customId: 'plotmodal_address', value: plot.address, style: TextInputStyle.Short})
        const addressTextLabel = new LabelBuilder({label: 'Address',}).setTextInputComponent(addressText)

        const modal = new ModalBuilder({customId: 'plotmodal', title: `Edit Plot`})
        modal.addTextDisplayComponents([modalSubtitle.toJSON()])
        modal.addLabelComponents([addressTextLabel.toJSON()])

        await i.showModal(modal, {withResponse: true})

        const res = await i.awaitModalSubmit({filter: interaction => interaction.customId == 'plotmodal', time: 5 * 60 * 1000})

        const newAddress = res.fields.getTextInputValue('plotmodal_address')

        return res.reply({components: [Responses.createContainer(`**New address:** \n- ${newAddress}`, accentColor).toJSON()], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2})
    }catch(err) {
        console.log(`[EditPlotButtonError]: \n${err}`)
        return i.reply({components: [Responses.createContainer(`**Edit Plot Error: **\n${err}`, accentColor).toJSON()], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2})
    }
}

async function deletePlotButton(i: ButtonInteraction, client: Bot, guildData: GuildInterface) {
    await i.deferReply({flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral})

    const accentColor = parseInt(guildData.accentColor, 16)

    //Find the plot through the message id
    let plot : PlotInterface = await Plot.findOne({id: i.message.id, guildId: guildData.id})
    if(plot) {
        //Prevent the other helpers, other then the plot author from editing the plot
        if(i.user.id != plot.plotter)
            return Responses.container(i, '**Only the plot author can delete the plot:**', accentColor)

        try {
            const res = await deletePlot(i, guildData, plot)
            return Responses.container(i, res, accentColor)
        }catch(err) {
            console.log(`[DeletePlotButtonError]: \n > ${err}`)
            return Responses.container(i, `**Delete Plot Error:** \n ${err}`, accentColor)
        }
    }else {
        //Delete the message if the plot was not found anymore
        Responses.container(i, '**Could not find plot anymore:** \nDeleting plot message', accentColor)
        return await i.message.delete()
    }
}

export { handlePlotMsg, assignPlotButton, editPlotButton, deletePlotButton }