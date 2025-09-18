import { EmbedBuilder, Guild, GuildBasedChannel, GuildMember, User, Interaction, Message, MessageFlags, TextChannel, TextThreadChannel, ThreadChannel, ButtonBuilder, ButtonStyle, ActionRowBuilder, resolveColor, AttachmentBuilder, ContainerComponent, MediaGalleryComponent, APIEmbedField } from "discord.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { Plot, PlotInterface } from "../struct/Plot.js";
import { GuildInterface } from "../struct/Guild.js";
import { addPlotClaimedReaction } from "./addPlotClaimedReaction.js";
import {createPlotContainer, createSubmissionContainer} from "../utils/createMessageContainers.js";
import Bot from "../struct/Client.js";
import { addPlotAddedReaction } from "./addPlotAddedReaction.js";
import { parseEditBuild } from "../utils/parseBuildMessage.js";
import plot from "../commands/plot.js";
import Responses from "../utils/responses.js";
import { CommandArg } from "../struct/Command.js";
import Submission, { BuildSize, SubmissionInterface, SubmissionType } from "../struct/Submission.js";
import { getNewSubmissionIndex } from "../utils/getNewSubmissionIndex.js";
import { downloadAttachment } from "../utils/downloadAttachment.js";
import { getPointsBreakdown } from "../utils/getPointsBreakdown.js";

/**
 * Claims an open plot and updates the plot message as being built by an applicant.
 * This removes the buttons on the plot message to disable assigning, editing or deleting the plot via the UI
 * @param i The interaction that start the claim, ex an command or a button
 * @param plot The plot info
 * @param builder The builder with applicant info
 * @param helper The guild member of the applicant helper
 * @param guildData The info of the guild
 * @param applicantThread The optional thread of the applicant. If It's null, it fetches the thread channel from the guild
 * @param plotsChannel The optional channel of the plots. If It's null, it fetches the text channel from the guild
 * @returns The markdown formatted string of the result of the action, ex error or success
 */
async function claimPlot(i: Interaction, client: Bot, plot: PlotInterface, builder: BuilderInterface, helper: GuildMember, guildData: GuildInterface, applicantThread?: ThreadChannel, plotsChannel?: GuildBasedChannel) : Promise<string> {
    //If client is not test, prevent the user from claiming plot for applicant, if user is not the helper of the applicant
    if(!client.test && builder.applicantInfo.helperId != i.user.id)
        return '**User is not helper of applicant**'

    //If client is not test, prevent the helper self-assigning the plot
    if(!client.test && i.user.id == builder.applicantInfo.helperId && i.user.id == builder.id)
        return '**Cannot self assign plots**'


    //Check if plot is already assigned to another applicant
    if(plot.builder != null)
        return '**Plot is already assigned to another applicant.**  \nOnly plots marked with 🟢 are free'

    //Check if plot was assigned to the same applicant
    if(plot.builder == builder.id)
        return '**Plot is already assigned to the applicant.**  \nOnly plots marked with 🟢 are free'

    if(plot.difficulty > builder.applicantInfo.initialSelfRate)
        return `**The difficulty ${plot.difficulty} of the plot is higher then the initial self rate ${builder.applicantInfo.initialSelfRate} of the applicant**`
    
    //Claim the plot
    plot.builder = builder.id
    const plotRes = await Plot.updateOne({id: plot.id, guildId: guildData.id}, {'$set' : { 'builder': builder.id}})
    if(plotRes.acknowledged) {

        //If applicant thread is null, fetch it
        if(applicantThread == null) {
            const applicantChannel = await i.guild.channels.fetch(guildData.applicantChannel) as TextChannel
            applicantThread = await applicantChannel.threads.fetch(builder.applicantInfo.threadId)
        }

        //If plot channel is null, fetch it
        if(plotsChannel == null)
            plotsChannel = await i.guild.channels.fetch(guildData.plotsChannel)

        //Create and send the new task message
        const newTaskEmbed = createNewTaskEmbed(plot, guildData, helper, i.guild.iconURL({size: 256}), plot.mapUrl)
        let taskMsg = await applicantThread.send({embeds: [newTaskEmbed.toJSON()], components: []})
        //Update plot with the id to the task message
        await Plot.updateOne({id: plot.id, guildId:guildData.id}, { $set: { 'taskmsg': taskMsg.id}})
        const applicantMember : GuildMember = await i.guild.members.fetch(builder.id);

        if(plotsChannel.isTextBased()) {
            //Get the plot message and mark it as claimed
            const msg = await plotsChannel.messages.fetch(plot.id)
            const plotAuthor : GuildMember = await i.guild.members.fetch(plot.plotter)
            const container = createPlotContainer(plot.address, plot.coords, plot.dateAdded, plot.refPhoto, plot.mapUrl, plotAuthor, guildData.accentColor, applicantMember, builder)
            let newMsg = await msg.edit({components: [container.toJSON()], flags: MessageFlags.IsComponentsV2})
            await addPlotClaimedReaction(newMsg)
        }

        
        return `**Plot \`${plot.address}\` assigned to applicant ${applicantMember}**`
    }

    return `**Could not claim plot**`
}

/**
 * Find the plots that are assigned to the applicant, but are still open. If there are any
 * it closes them and reopens (re-adds action buttons) to their plot message.
 * @param client The bot
 * @param builder The builder with the applicant info
 * @param guildData The guild info
 * @returns An string array of the markdown links to the now reopened plot messages
 */
async function closeOpenPlots(client: Bot, builder: BuilderInterface, guildData: GuildInterface) : Promise<string[]> {
    let plotLinks = []
    //Find plots that are assign to the applicant but not yet complete
    const plots = await Plot.find({guildId: guildData.id, builder: builder.id, complete: null})
    if(plots.length > 0) {
        //Get the plots channel
        const guild = await client.guilds.fetch(guildData.id)
        const plotChannel = await guild.channels.fetch(guildData.plotsChannel) as TextChannel
        const applicantChannel = await guild.channels.fetch(guildData.applicantChannel) as TextChannel
        let applicantThread : TextThreadChannel

        try {
            applicantThread = await applicantChannel.threads.fetch(builder.applicantInfo.threadId)
        }catch(err) {}
    
        //Get links to the plot and delete the task message in the applicant thread (if the thread exists)
        for(let plot of plots) {
            if(applicantThread) {
                const taskMsg = await applicantThread.messages.fetch(plot.taskmsg)
                await taskMsg.delete()
            }

            const plotMsg = await reopenPlotMessage(guild, guildData, plotChannel, plot)
            plotLinks.push(`[\`${plot.address}\`](${plotMsg.url})`)
        }

        //Mark the plot applicant and task message as null for the open plots of the applicant
        await Plot.updateMany({guildId: guildData.id, applicant: builder.id, complete: null}, { $set: {applicant: null, taskmsg: null}})
    }

    return plotLinks
}

/**
 * Revokes an open plot from the applicant and notifies the applicant (in the applicant thread) of the revoke
 * @param i The interaction that started the revoke, ex command
 * @param plot The plot info
 * @param builder The builder with the applicant info
 * @param helper The guild member of the helper
 * @param guildData The guild info
 * @param applicantThread The applicant thread
 * @returns The markdown formatted string of the result of the revoke, ex. error or success
 */
async function revokePlot(i: Interaction, plot: PlotInterface, builder: BuilderInterface, helper: GuildMember, guildData: GuildInterface, applicantThread: ThreadChannel) : Promise<string> {
    if(!plot.builder)
        return '**Plot is not assigned to a applicant**'

    if(builder.applicantInfo.helperId != helper.id)
        return '**Helper is not assigned to applicant**'

    if(plot.builder != builder.id)
        return '**Plot is not assigned to applicant**'

    const res = await Plot.updateOne({id: plot.id, guildId: guildData.id}, {$set: { 'builder': null, 'taskmsg': null}})
    if(res.acknowledged) {
        //Get the applicant thread and remove the task message tied to the plot (if the applicant thread exists)
        const applicantChannel = await i.guild.channels.fetch(guildData.applicantChannel) as TextChannel

        try {
            const applicantThread = await applicantChannel.threads.fetch(builder.applicantInfo.threadId)
            const taskMsg = await applicantThread.messages.fetch(plot.taskmsg)
            await taskMsg.delete()

        }catch(err) {}


        //Get the plots channel and update the plot message
        const plotsChannel = (await i.guild.channels.fetch(guildData.plotsChannel)) as TextChannel
        const plotMsg = await reopenPlotMessage(i.guild, guildData, plotsChannel, plot)
        applicantThread.send({embeds: [Responses.createEmbed(`Your plot [\`${plot.address}\`](${plotMsg.url}) has been revoked`, guildData.accentColor)]})
        return  `**The plot [\`${plot.address}\`](${plotMsg.url}) has been revoked from the applicant**`
    }

    return `**Could not revoke plot \`${plot.address}\`**`
}

/**
 * Update the plot message to the open state again, by updating the container 
 * and re-adding the plot added reaction to the message
 * @param guild The guild
 * @param guildData The guild info
 * @param plotsChannel The text channel of the plots
 * @param plot The plot info
 * @returns The now updated plot message
 */
async function reopenPlotMessage(guild: Guild, guildData: GuildInterface, plotsChannel: TextChannel, plot: PlotInterface) : Promise<Message<true>> {
    let plotMsg = await plotsChannel.messages.fetch(plot.id)
    const plotAuthor = await guild.members.fetch(plot.plotter)
    const plotContainer = createPlotContainer(plot.address, plot.coords, plot.difficulty, plot.refPhoto, plot.mapUrl, plotAuthor, guildData.accentColor)
    plotMsg = await plotMsg.edit({components: [plotContainer.toJSON()], flags: MessageFlags.IsComponentsV2})
    await addPlotAddedReaction(plotMsg)

    return plotMsg
    
}

/**
 * Updates the plot with the new info if they are in the correct format
 * @param i The interaction that started the edit, ex command or modal submit
 * @param guildData The guild info
 * @param plot The original plot info
 * @param newAddress Update new address, else null
 * @param newCoords Updated new coordinates, else null
 * @param newDifficulty Update new difficulty, else null
 * @param newMapLink Update ned link of the plot on a online map, else null
 * @returns The markdown formatted string of the result of the edit, ex error or success
 */
async function editPlot(i: Interaction, guildData: GuildInterface, plot: PlotInterface, newAddress: string, newCoords: string, newDifficulty: number, newMapLink: string) : Promise<string> {
    let edit = {}
    edit['submission'] = {}
    const {
        parsed,
        count,
        updatedCountLine,
        coords,
        updatedCoordsLine,
        address,
        updatedAddressLine,
        url,
        updatedUrlLine
    } = parseEditBuild(newDifficulty, plot.difficulty, newCoords, plot.coords, newAddress, plot.address, true, newMapLink, plot.mapUrl)

    if(parsed) {
        let message = `**Plot(${plot.id}) updated with:**`

        if(updatedCountLine) {
            edit['difficulty'] = count
            plot.difficulty = count
            message += `\n> - Difficulty: \`${count}\``
        }
        if(updatedCoordsLine) {
            edit['coords'] = coords
            plot.coords = coords
            message += `\n> - Coordinates: \`${coords}\``

        }
        if(updatedAddressLine) {
            edit['address'] = address
            plot.address = address
            message += `\n> - Address: \`${address}\``
        }
        if(updatedUrlLine){
            edit['mapUrl'] = url
            plot.mapUrl = url
            message += `\n> - Map url: \`${url}\``
        }

        //Update the plot
        await Plot.updateOne({id: plot.id, guildId: guildData.id}, {'$set': edit})
        
        //Get the plot message and update it
        const plotsChannel = (await i.guild.channels.fetch(guildData.plotsChannel)) as TextChannel
        const plotMsg = await plotsChannel.messages.fetch(plot.id)
        const plotAuthor = await i.guild.members.fetch(plot.plotter)
        const plotContainer = createPlotContainer(plot.address, plot.coords, plot.difficulty, plot.refPhoto, plot.mapUrl, plotAuthor, guildData.accentColor)
        await plotMsg.edit({components: [plotContainer.toJSON()], flags: MessageFlags.IsComponentsV2})

        return message
    }else {
        let message = '**The provided one or more edits have an incorrect format:**'
        if(updatedCoordsLine === false)
            message += '\n- Invalid or unrecognized coordinates'
        if(updatedUrlLine == false)
            message += '\n- Invalid or unrecognized map url'

        return message
    }
}

/**
 * Deletes an open plot and removes the plot message
 * @param i The interaction that started the deletion, ex and command or button
 * @param guildData The guild info
 * @param plot The plot info
 * @returns The markdown formatted string of the result of the deletion, ex error or success
 */
async function deletePlot(i: Interaction, guildData: GuildInterface, plot: PlotInterface) : Promise<string> {
    if(plot.builder)
        return '**Cannot delete plot:** \nPlot is assigned to a builder'

    if(plot.plotter != i.user.id)
        return '**Only the plot author can delete the plot**'

    //Get plot channel and plot message
    const plotChannel = (await i.guild.channels.fetch(guildData.plotsChannel)) as TextChannel
    const plotMsg = await plotChannel.messages.fetch(plot.id)
    //Delete the plot
    let res = await Plot.deleteOne({id: plot.id, guildId: guildData.id})
    if(res.acknowledged) {
        await plotMsg.delete()
        return `**Plot - ${plot.address}(${plot.id}) deleted**`
    }
    
    return `**Plot - ${plot.address}(${plot.id}) was not deleted**`
}

/**
 * Review an open plot and mark it as closed. This is a special implementation of the review command, only used for applicants
 * @param i The interaction that start the claim, ex an command or a button
 * @param client The bot
 * @param plot The plot info
 * @param builder The builder with the  applicant info
 * @param builderUser The builder user
 * @param helper The guild member of the applicant helper
 * @param buildCount The number of builds
 * @param size The size of the build
 * @param quality The quality of the build
 * @param complexity The complexity of the build
 * @param bonus Bonus of the build
 * @param buildImageName The name of the build image file
 * @param buildImageUrl The url to the build image
 * @param feedback The feedback to the review
 * @param guildData The info of the guild
 * @param applicantThread The thread of the applicant
 * @returns The markdown formatted string of the result of the action, ex error or success
 */
async function reviewPlot(i: Interaction, client: Bot, plot: PlotInterface, builder: BuilderInterface, builderUser: User, helper: GuildMember, buildCount: number, size: number, quality: number, complexity: number, bonus: number, feedback: string, buildImageUrl : string, buildImageName: string, guildData: GuildInterface, applicantThread: ThreadChannel) : Promise<string>  {
    //Check if a submission already exists for the plot
    let plotSubmission : SubmissionInterface = await Submission.findOne({guildId: guildData.id, plotId: plot.id}).lean()
    if(plotSubmission) 
        return '**Plot is already reviewed**'

    if(plot.builder == null)
        return '**Plot is not assigned to any applicant**'
    
    //If the client is not test, check if user is not helper of the applicant
    if(!client.test && builder.applicantInfo.helperId != i.user.id)
        return '**User is not helper of applicant**'

    //If the client is not test, prevent the helper self-reviewing the plot
    if(!client.test && i.user.id == builder.applicantInfo.helperId && i.user.id == builder.id)
        return '**Cannot self review plots**'

    //Check if plot was assigned to the same applicant
    if(plot.builder != null && plot.builder != builder.id)
        return '**Plot is not assigned to the applicant**'

    const plotChannel = await i.guild.channels.fetch(guildData.plotsChannel) as TextChannel
    let plotMsg : Message

    //Get the plot msg
    try {
        plotMsg = await plotChannel.messages.fetch(plot.id)
    }catch(err) {
        return `**Could not find plot message for plot: \`${plot.address}\` (ID: ${plot.id}**`
    }

    let taskMsg : Message

    //Get the task msg tied to the plot
    try {
        taskMsg = await applicantThread.messages.fetch(plot.taskmsg)
    }catch(err) { 
        //If the task message was not found, remove the task message id from the plot
        await Plot.updateOne({guildId: guildData.id, id: plot.id}, {$set: {'taskmsg': null}})
    }

    let attachmentImageFiles : AttachmentBuilder[] = []
    let attachmentImageLinks : string[] = []

    //Download the build image
    try {
        let imageFile = await downloadAttachment(buildImageUrl, buildImageName)
        attachmentImageFiles.push(imageFile)
        attachmentImageLinks.push(`attachment://${buildImageName.replace(' ', '-')}`)
    }catch(err) {
        return `**There was an error downloading the build image:** \n ${err}`
    }

    //Review the plot by submitting it to the submission and inserting a build for it
    let pointsTotal = size * quality * complexity
    let submissionIndex = await getNewSubmissionIndex(guildData)
    let submissionData : SubmissionInterface = {
        id: plot.id,
        guildId: guildData.id,
        index : submissionIndex,
        plotId: plot.id,
        submissionType: SubmissionType.ONE,
        userId: builder.id,
        pointsTotal: pointsTotal,
        collaboratorsCount: 1,
        buildImages: [],
        buildCount: buildCount,
        bonus: bonus,
        edit: false,
        reviewTime: i.createdTimestamp,
        reviewer: helper.id,
        feedback: feedback,
        size: size,
        quality: size,
        complexity: complexity,
        submissionTime: i.createdTimestamp,
    }

    //Update the submissions by inserting it
    const submissionRes = await Submission.updateOne({id: plot.id, guildId: guildData.id}, submissionData, {upsert: true}).exec()
    if(submissionRes.acknowledged) {
        const submissionChannel = await i.guild.channels.fetch(guildData.submitChannel) as TextChannel
        //Create the new submission container for the new submission
        const submissionContainer = await createSubmissionContainer(
            submissionIndex,
            builderUser,
            builder,
            buildCount,
            plot.coords,
            plot.address,
            1,
            [],
            attachmentImageLinks, 
            guildData.accentColor, 
            i.guild, 
            helper.user, 
            submissionData
        )

        //Insert the new submission into the submission channel and mark is as reviewed
        let submissionMessage = await submissionChannel.send({components: [submissionContainer], files: attachmentImageFiles, flags: MessageFlags.IsComponentsV2})
        let messageContainerComponent = submissionMessage.components[0] as ContainerComponent
        //Get the media gallery component at the end of the message container component
        let buildImagesGallery = messageContainerComponent.components[messageContainerComponent.components.length - 1] as MediaGalleryComponent
        //Get the url to the image in the message
        let uploadedBuildImage = buildImagesGallery.items.map(item => item.media.url)
        
        //Update the submission in the db with the actual url 
        await Submission.updateOne({id: plot.id, guildId: guildData.id}, { $set: { 'buildImages': uploadedBuildImage }})

        //Increment the applicant points, building count and solo builds
        await Builder.updateOne(
            { id: builder.id, guildId: guildData.id,  },
            {
                $inc: {
                    pointsTotal: pointsTotal,
                    buildingCount: 1,
                    soloBuilds: 1
                }
            }
        ).exec()

        builder.buildingCount = (builder.buildingCount != null ? builder.buildingCount : 0) + 1
        builder.pointsTotal = (builder.pointsTotal != null ? builder.pointsTotal : 0) + pointsTotal
        builder.soloBuilds = (builder.soloBuilds != null ? builder.soloBuilds : 0) + 1

        let reachedMin = builder.pointsTotal >= 8
        let pointsToGo = 8 - builder.pointsTotal


        let reply = `Your assigned plot \`${plot.address}\` has been reviewed. \n`

        if(reachedMin)
            reply += `You have now reached **${builder.pointsTotal}/8** total points, the minimum required points to become a builder.`
        else
            reply += `You have now gained **${builder.pointsTotal}/8** total points, **${pointsToGo}** more to go.`

        reply += `\n\n__Feedback:__ \`${feedback}\`\n__[Submission #${submissionIndex}](<${submissionMessage.url}>)__\n\n*__Points breakdown:__*`

        //Get the submissions stats
        let pointsBreakdown = getPointsBreakdown(submissionData)
        let embedFields : APIEmbedField[] = []
        pointsBreakdown.forEach((pointBreakdown) => embedFields.push({
            name: pointBreakdown.name, 
            value: pointBreakdown.value,
            inline: true}))

        //Create the progress report of the applicant
        const progressEmbed = new EmbedBuilder()
            .setTitle(`You've gained **${pointsTotal}** 🌟`)
            .setDescription(reply)
            .setFooter({text: guildData.name, iconURL: i.guild.iconURL({size: 256})})
            .setColor(`#${guildData.accentColor}`)
            .setTimestamp(submissionData.reviewTime)
            .setImage(uploadedBuildImage.at(0))
            .setFields(embedFields)

        //Send the progress embed to the applicant
        applicantThread.send({embeds: [progressEmbed.toJSON()], components: []})

        const applicantMember : GuildMember = await i.guild.members.fetch(builder.id);

        //And return the progress report to the helper
        let res = `The applicant ${applicantMember} has gained **${pointsTotal} points** for the plot `
        if(taskMsg)
            res += `[\`${plot.address}\`](${taskMsg.url}) `
        else
            res += `[\`${plot.address}\`](${plotMsg.url})`

        res += `
        
        *__Points breakdown:__*\n`

        pointsBreakdown.forEach((pointBreakdown) => res += `${pointBreakdown.name}: ${pointBreakdown.value} \n`)
        
        res += `__Feedback:__ \`${feedback}\`
        __[Submission #${submissionIndex}](<${submissionMessage.url}>)__`

        if(reachedMin) 
            res += `\n\nThe applicant has now reached **${builder.pointsTotal}/8** total points and is qualified to become a builder.
        > ✨Use the command \`/accept\` in the applicant thread to accept them`
         else
            res += `\n\nThe applicant has now gained **${builder.pointsTotal}/8** total points and needs to gain min **${pointsToGo}** more points.`

         return res
    }

    return `**Could not review plot**`
}

/**
 * DM plot builder if they wish to revoke the plot
 * @param client The Discord bot
 * @param plot The plot the builder owns
 * @param newPlotBuilder The user who wishes to claim the plot
 * @param guildData Guild data
 * @param guild Guild
 */
async function requestPlotRelease(client: Bot, plot: PlotInterface, newPlotBuilder: User, guildData: GuildInterface, guild: Guild) {
    //Get the latest submission id of the plot that was not rejected
    let submission : SubmissionInterface = await Submission.aggregate([
        {
            $match: {
                guildId: guildData.id,
                plotId: plot.id
            }
        },
        {
            $lookup: {
                from: 'rejection',
                let: {submissionId: '$id'},
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$id', '$$submissionId']},
                                    { $eq: ['$guildId', guildData.id]}
                                ]
                            }
                        }
                    }
                ],
                as: 'rejection'
            }
        },
        {
            $match: {
                'rejection': []
            }
        },
        {
            $sort: { submissionTime: -1}
        }
    ])[0]
    //let submission = await Submission.findOne({id: submissionId, guildId: plot.guildId})
    let submissionBuilder : BuilderInterface  = await Builder.findOne({id: submission.id, guildId: guildData.id}).lean()
    let plotBuilderUser = await client.users.fetch(plot.builder)
    let submissionReviewer : User = (submission.reviewer != null) ? await client.users.fetch(submission.reviewer) : null

    //Create the submission container for the latest successful submission
    const submissionContainer = await createSubmissionContainer(
        submission.index, 
        plotBuilderUser, 
        submissionBuilder, 
        submission.buildCount,
        plot.coords, 
        plot.address, 
        submission.collaboratorsCount, 
        (submission.collaborators?.length > 0) ? submission.collaborators : [], 
        submission.buildImages, 
        guildData.accentColor, 
        guild,
        submissionReviewer,
        submission
    )

    const releasePlotButton = new ButtonBuilder()
        .setCustomId(`plot_release_${plot.id}`)
        .setLabel('Release plot')
        .setStyle(ButtonStyle.Danger)
    const row = new ActionRowBuilder().addComponents(releasePlotButton)

    const requestText = `The builder ${newPlotBuilder} wishes to claim your plot.
    Below, you can view the info on your latest not-rejected submission. 
    If you agree with the request, you may click on the **\`Release plot\`** to proceed.`

    const dm = await plotBuilderUser.createDM()
    await dm.send({
        embeds: [{
            title: `${guildData.emoji} | Plot management`,
            description: requestText,
            color: resolveColor(`#${guildData.accentColor}`),
            fields: [
                { name: 'Address', value: plot.address},
                { name: 'Coordinates', value: `\`${plot.address}\``}
            ]
        }],
        components: [row.toJSON()]
    }).catch((err) => {
        console.log(err)
    })

    await dm.send({
        components: [submissionContainer],
        flags: MessageFlags.IsComponentsV2
    })
}

async function releasePlotButton(client: Bot, i: Interaction, plotId: string, newPlotBuilderId: string, guildData: GuildInterface) {
    let plot : PlotInterface = await Plot.findOne({id: plotId, guildId: i.guildId}).lean()
    if(!plot)
        return Responses.plotNotFound(i, guildData.accentColor)

    if(plot.builder != i.user.id)
        return Responses.plotClaimedByAnotherBuilder(i, guildData.accentColor)

    let newPlotBuilderMember = await i.guild.members.fetch(newPlotBuilderId)
    //Check if the new plot builder is not a team member anymore
    if(!newPlotBuilderMember)
        return Responses.embed(i, 'The new plot builder is no longer a team member', guildData.accentColor)

    //Set the plot builder to the new plot builder id
    await Plot.updateOne({id: plot.id, guildId: plot.guildId}, {$set: {builder: newPlotBuilderId}})

    let dm = await newPlotBuilderMember.createDM()
    await dm.send({
        embeds: [{
            title: `${guildData.emoji} | Plot claimed`,
            description: `The ownership of the plot has been successfully transferred.
            You can now submit submissions using this address.`,
            color: resolveColor(`#${guildData.accentColor}`),
            fields: [
                { name: 'Address', value: plot.address},
                { name: 'Coordinates', value: `\`${plot.address}\``}
            ]
        }]
    })

    return Responses.embed(i, 'You have successfully revoked the plot ownership', guildData.accentColor)
}

/**
 * Creates the embed that gets display to the applicant in the application thread once a task gets assigned to them
 * @param plot The plot info
 * @param guildData The guild info
 * @param helper The guild member of the helper
 * @param guildIcon The icon of the guild
 * @returns The EmbedBuilder of the embed
 */
function createNewTaskEmbed(plot: PlotInterface, guildData: GuildInterface, helper: GuildMember, guildIcon: string, plotImage: string) : EmbedBuilder {
    const paragraphOne = `Your task is to build the plot at the address \`${plot.address}\`, which you can find on the map [here](${plot.mapUrl}).`
    
    const paragraphTwo = `If you are new to building in BTE make sure to check out the guide:\n${guildData.applicantFormatMsg.guideLink}`

    const paragraphThree = `${guildData.applicantFormatMsg.visitServerMsg}. And as you build, be sure to send update screenshots or write any questions that you may have here.`

    const paragraphFour = `A helper may not immediately notice your message, so make sure to ping your designated helper ${helper} after sending an update or if you didn't receive your permissions yet **after** joining the server for the first time.`

    const paragraphFive = 'There is no general time limit to build your assigned plot, so take your time and good luck with building.'

    const newTaskEmbed = new EmbedBuilder()
        .setTitle("You've been assigned a new task 🚧")
        .setDescription(`${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree} \n\n${paragraphFour} \n\n${paragraphFive}`)
        .setFooter({text: guildData.name, iconURL: guildIcon})
        .setColor(`#${guildData.accentColor}`)
        .setTimestamp(new Date())
        .setImage(plotImage)
        .setFields([
            {
                name: 'Teleport Command',
                value: `\`/tpll ${plot.coords}\``
            },
            {
                name: 'Plot ID',
                value: plot.id
            }
        ])

    return newTaskEmbed
}

export { claimPlot, closeOpenPlots, revokePlot, reopenPlotMessage, editPlot, deletePlot, reviewPlot, requestPlotRelease, releasePlotButton }