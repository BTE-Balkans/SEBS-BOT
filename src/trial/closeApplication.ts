import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction, MessageFlags, ThreadChannel } from "discord.js";
import Bot from "../struct/Client.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { sendDm } from "./sendDm.js";
import { Plot } from "../struct/Plot.js";
import { closeOpenPlots } from "./handlePlot.js";
import Responses from "../utils/responses.js";

async function closedApplication(client: Bot, deletedThread : boolean = false, i?: Interaction, thread? : ThreadChannel) {
    //Get the thread channel
    if(!thread && i)
        thread = i.channel as ThreadChannel

    const guildData = client.guildsData.get(thread.guildId)

    //Check if thread channel is associated with a builder thread
    const builder : BuilderInterface = await Builder.findOne({guildId: thread.guildId, threadId: thread.id }).lean()

    let threadID : string = null
    let closed : boolean = false

    //Check if the thread was deleted
    if(deletedThread) {
        //If application was not already closed, mark is as closed
        if(builder?.applicationClosed) {
            closed = true
        }
    }else{
        threadID = builder.threadId

        //If application was already closed, send reply
        if(builder?.applicationClosed) {
            if(i && i.isButton())
                return Responses.embed(i, '**The application is already closed**', guildData.accentColor)
        }else {
            closed = true
        }
    }

    //Mark the builder thread id as null only if the thread was deleted, and mark the application as closed
    await Builder.updateOne({ id: builder.id, guildId: builder.guildId }, { $set : { 'threadId' : threadID, 'applicationClosed' : true }}, { upsert: true })

    if(closed) {
        //If there are any assigned plots that are not yet complete, remove their assigned builder 
        const plotLinks = await closeOpenPlots(client, builder, guildData)
        let plotsLinksMsg : string = ''
        if(plotLinks.length > 0) {
            for(let plotLink of plotLinks) {
                plotsLinksMsg += ` \n> - ${plotLink}`
            }
        }

        //Find the guild member of the builder
        const builderMember = await thread.guild.members.fetch(builder.id)
        if(builderMember) {
            let builderMessage = 'Your builder application was closed'
            if(plotLinks.length) {
                builderMessage += ` \n> The following plots have been revoked: ${plotsLinksMsg}`
            }

            //Send dm to member, notifying them of the builder application closure
            await sendDm(builderMember, guildData, builderMessage, 'Builder Application Closure')

            //Find the helper guild and notify them of the user closing their application
            const helper = await thread.guild.members.fetch(builder.helperId)
            if(helper) {
                let helperMessage = `**${ (!deletedThread) ? `[${thread.name}](${thread.url})` : `${thread.name}(${builderMember})`} closed their application**`
                if(plotLinks.length > 0) {
                    helperMessage += ` \n> The following open plots have been left unfinished. Clear them before resigning them: ${plotsLinksMsg}`
                }
                await sendDm(helper, guildData, helperMessage, 'Builder Application Closure')
            }
        }

        //If application was just closed but the builder thread was not deleted
        //send the reopen application button and the plots revoked message
        if(!deletedThread) {
            //Create a reopen button
            const reopenButton = new ButtonBuilder()
                .setCustomId('builder_reopenapplication')
                .setLabel('Reopen application')
                .setEmoji('🎟️')
                .setStyle(ButtonStyle.Danger)
            
            const row = new ActionRowBuilder().addComponents(reopenButton)

            if(i && i.isButton()) {
                await Responses.embed(i, '**The builder application was closed**', guildData.accentColor)

                //Clear the `Close application` button from the original message
                if(i.message)
                    await i.message.edit({components: []})
            }

            //Send the plots revoked msg
            if(plotLinks.length) {
                await thread.send({embeds: [Responses.createEmbed(`**The following plots have revoked:** ${plotsLinksMsg}`, guildData.accentColor).toJSON()]})
            }

            let res = '**Builder Application Status: Closed**'
            //Only send the reopen application button if the builder is still a junior builder
            if(builder.rank == -1)
                return await thread.send({embeds: [Responses.createEmbed(res, guildData.accentColor).toJSON()], components: [row.toJSON()]})
            else
                return await thread.send({embeds: [Responses.createEmbed(res, guildData.accentColor).toJSON()]})
        }
    }
}

/**
 * Closes the application, with the builder thread already deleted
 * It notifies the helper and the builder via dm of the closure while including the info
 * of any possible still open tasks left, that get closed afterwards. 
 * 
 * Ex, if any open plot is left, it notifies the helper via dm, to clear the plot on the server,
 * before using the plot again for another builder
 * @param client The bot
 * @param thread  The deleted builder thread
 */
async function deletedBuilderThread(client: Bot, thread: ThreadChannel) {
    await closedApplication(client, true, null, thread)
}

/**
 * Closes the application, with the builder thread still open
 * It notifies the helper and the builder via dm of the closure while including the info
 * of any possible still open tasks left, that get closed afterwards. 
 * 
 * Ex, if any open plot is left, it notifies the helper via dm, to clear the plot on the server,
 * before using the plot again for another builder
 * @param i The interaction that start the closure
 * @param client The bot
 * @returns An message if an error happened, else void
 */
async function closeApplication(i: Interaction, client: Bot) {
    if(i && i.isButton())
        await i.deferReply({flags: MessageFlags.Ephemeral})

    return await closedApplication(client, false, i)
}

export { deletedBuilderThread, closeApplication }