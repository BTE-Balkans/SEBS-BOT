import { ActionRowBuilder, AttachmentBuilder, AttachmentFlags, AttachmentFlagsBitField, ButtonBuilder, ButtonStyle, ComponentType, ContainerBuilder, ContainerComponent, Guild, Interaction, MediaGalleryComponent, Message, MessageFlags, ModalBuilder, resolveColor, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { GuildInterface } from "../struct/Guild.js";
import { parseBuildMessage } from "../utils/parseBuildMessage.js";
import { insertBuilder } from "./insertBuilder.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import Bot from "../struct/Client.js";
import { ensureBuilderMinecraftUsername } from "../utils/ensureBuilderMinecraftUsername.js";
import Submission, { CollaboratorInterface, ParticipantType, SubmissionInterface } from "../struct/Submission.js";
import { downloadAttachment } from "../utils/downloadAttachment.js";
import { createSubmissionContainer } from "../utils/createMessageContainers.js";
import { Plot, PlotInterface } from "../struct/Plot.js";
import { requestPlotRelease } from "../trial/handlePlot.js";
import { rejectMessage } from "../utils/rejectMessage.js";
import { getNewSubmissionIndex } from "../utils/getNewSubmissionIndex.js";

/**
 * Parse a submission message and insert it into the db after re-posting it into the submissions channel
 * @param client The bot
 * @param msg The original (non-bot) builder message
 * @param guildData Guild data
 * @returns true if the submission was parsed, else false if it was rejected
 */
async function handleSubmissionMsg(client : Bot, msg: Message, guildData: GuildInterface) {
    //Check that the submission has at least one image attached if the client is not a test
    if (!client.test && msg.attachments.size === 0 || (msg.attachments.size > 0 && msg.attachments.at(0).contentType.startsWith('image'))) {
        return reject(msg, guildData, 'NO IMAGE FOUND')
    }
    
    const { 
        error,
        count,
        hasCountLine,
        coords,
        hasCoordsLine,
        address,
        hasAddressLine,
        contributorsCount,
        contributors,
        hasContributorsLine
    } = await parseBuildMessage(msg, false, true)

    if(error) {
        if(error != '')
            return reject(msg, guildData, error, 'ERROR WHILE PARSING INFO')

        if(hasCountLine)
            return reject(msg, guildData, `BUILD COUNT NOT SET`)

        if(hasCoordsLine) 
            return reject(msg, guildData, 'INVALID OR UNRECOGNIZED COORDINATES') // reject submission/plot if it doesn't include coords

        if(hasAddressLine)
            return reject(msg, guildData, 'EMPTY ADDRESS')

        if(hasContributorsLine) 
            return reject(msg, guildData, 'EMPTY CONTRIBUTORS LINE')

        return reject(msg, guildData, 'ERROR WHILE PARSING')
    }
    
    let contributorsInfo : { collaborators: CollaboratorInterface[], collaboratorsCount: number } = { collaborators: contributors, collaboratorsCount : contributorsCount }

    const submissionAuthor = await msg.guild.members.fetch(msg.author.id)

    // insert builder if not yet added
    await insertBuilder(submissionAuthor, guildData)

    //Fetch Guild member
    const guildMember = await msg.guild.members.fetch(msg.author.id)

    //Confirm if builder has a Minecraft username set
    const submissionBuilder = await ensureBuilderMinecraftUsername(guildMember, guildData)

    //Remind user to set their Minecraft username
    if(!submissionBuilder) 
        return reject(msg, guildData, '**Set your Minecraft username and resend the submission**', 'INCOMPLETE INFO: MISSING MINECRAFT USERNAME',  60 * 1000)

    //Check if plot with the give address already exists
    let plot : PlotInterface = await Plot.findOne({guildId: guildData.id, address: address}).lean()
    if(plot) {
        if(plot.builder && plot.builder != submissionAuthor.id) {
            let plotBuilderUser = await client.users.fetch(plot.builder)
            await requestPlotRelease(client, plot, guildMember.user, guildData, msg.guild)

            return reject(msg, guildData, `Only the plot builder ${plotBuilderUser} may submit submissions using this address. 
                The plot builder will be contacted if they wish to free up the plot. 
                If they do, you will be able claim the plot and re-submit the submission`, 'This address is already claimed')
        }
            

        //Claim the plot
        //#ToDo: This will be removed later when plots will need to be created first by helpers, and then claimed by builders before they can build
        plot.builder = submissionAuthor.id
        await Plot.updateOne({id: plot.id, guildId: plot.id}, {$set: {'builder': plot.builder, coords: coords}})
    }

    //return reject(msg, guildData, 'Submission with this address already exists', 'Duplicate data')


    //If any the contributors of type member exist, insert them as builder
    for(let collaborator of contributorsInfo.collaborators) {
            if(collaborator.type == ParticipantType.Member)
                insertBuilder(await msg.guild.members.fetch(collaborator.value), guildData)
        }

    //Download the submission images
    let attachmentImageLinks : string[] = []
    let attachmentImageFiles : AttachmentBuilder[] = []

    if(!client.test) {
        for(let k in msg.attachments) {
            let attachment = msg.attachments.get(k)
            //Ensure the attachment is a image
            if(attachment.contentType.startsWith('image')) {
                try {
                    let imageFile = await downloadAttachment(attachment.url, attachment.name)
                    attachmentImageFiles.push(imageFile)
                    attachmentImageLinks.push(`attachment://${attachment.name.replace(' ', '-')}`)
                }catch(err) {
                    return reject(msg, guildData, `${err}`, 'ERROR WHILE DOWNLOADING REFERENCE IMAGE')
                }
            }
        }
    }else {
        attachmentImageLinks = [
            "https://i.imgur.com/EVsuvfQ.jpeg"
        ]
    }

    const submissionIndex = await getNewSubmissionIndex(guildData)
    const submissionContainer = await createSubmissionContainer(
        submissionIndex, 
        submissionAuthor.user, 
        submissionBuilder, 
        count,
        coords, 
        address, 
        contributorsInfo.collaboratorsCount, 
        contributorsInfo.collaborators, 
        attachmentImageLinks, 
        guildData.accentColor, 
        msg.guild)

    if(!msg.channel.isSendable())
        return reject(msg, guildData, 'Could not send the to channel', 'INVALID CHANNEL')

    //Delete the original message
    msg.delete().catch(() => {})
    //Post the submission message with the container
    let newMsg : Message
    try {
        //Attack the submission images if client test is false
        newMsg = !client.test ?
            await msg.channel.send({components: [submissionContainer], files: attachmentImageFiles, flags: MessageFlags.IsComponentsV2}) :
            await msg.channel.send({components: [submissionContainer], flags: MessageFlags.IsComponentsV2})
    } catch(err) {
        console.log('[HandleSubmissionMsgError] ' + err)
        return reject(msg, guildData, `Exception: ${err}`, 'ERROR WHILE CREATING SUBMISSION CONTAINER', 30000, false)
    }

    
    let newMsgContainerComponent = newMsg.components[0] as ContainerComponent
    //Get the media gallery component at the end of the new message container component
    let buildImagesGallery = newMsgContainerComponent.components[newMsgContainerComponent.components.length - 1] as MediaGalleryComponent
    //Get the url's to the images in the new message
    let buildImages = buildImagesGallery.items.map(item => item.media.url)

    let collaboratorsInfo = {}
    //Set the collaborators prop if contributorsInfo contains any collaborators
    if(contributorsInfo.collaborators.length > 0) {
        collaboratorsInfo = {
            collaborators : contributorsInfo.collaborators
        }
    }

    //Insert the submission
    await Submission.updateOne({id: newMsg.id, guildId: guildData.id}, {
        $set: {
            index: submissionIndex,
            plotId: (plot) ? plot.id : newMsg.id,
            userId: submissionBuilder.id,
            ...collaboratorsInfo,
            collaboratorsCount: contributorsInfo.collaboratorsCount,
            buildImages: buildImages,
            buildCount: count,
            submissionTime: msg.createdTimestamp,
            reviewer: null
        }
    }, { upsert: true})

    //Now insert a new plot if It doesn't exist yet
    //ToDo: This will be removed later when plots will need to be created first by helpers
    if(!plot) {
        await Plot.updateOne({id: newMsg.id, guildId: guildData.id}, {
            $set: {
                plotter: submissionAuthor.id,
                builder: submissionAuthor.id,
                dateAdded: msg.createdTimestamp,
                coords: coords,
                address: address
            }
        }, { upsert: true })
    }

    return true
}

// helper func that sends the rejection msg and deletes the submission
async function reject(msg: Message, guildData: GuildInterface, reason: string, title? : string, time = 30000, deleteOrgMsg = true) {
    await rejectMessage(msg, reason, `INCORRECT SUBMISSION FORMAT: ${reason}`, `**[Correct format:](${guildData.formattingMsg})**\n[Build count]\n[Geographic coordinates]\n[Build name (opt.), International address]\n[Collaborators (Optional)]\n[Image(s) of build]\n\n__The entire submission must be in ONE MESSAGE!__\nView [pinned message](${guildData.formattingMsg}) for more details.`, guildData, time, title, deleteOrgMsg)
    return false
}

async function updateSubmissionMsg(client: Bot, submissionMsg: Message, submission: SubmissionInterface, guildData: GuildInterface, guild: Guild, reviewer?: User) {
    let plot : PlotInterface = await Plot.findOne({id: submission.plotId, guildId: guildData.id}).lean()
    let submissionBuilder : BuilderInterface = await Builder.findOne({id: submission.userId, guildId: guildData.id}).lean()
    let submissionUser = await client.users.fetch(submission.userId)

    //Create the submission container with the new info
    let submissionContainer = await createSubmissionContainer(
        submission.index,
        submissionUser,
        submissionBuilder, 
        submission.buildCount,
        plot.coords,
        plot.address,
        submission.collaboratorsCount,
        submission.collaborators ? submission.collaborators : [],
        submission.buildImages,
        guildData.accentColor,
        guild, 
        reviewer,
        submission
    )
    //Update the original message
    submissionMsg.edit({components: [submissionContainer]})
}

export { handleSubmissionMsg, updateSubmissionMsg }