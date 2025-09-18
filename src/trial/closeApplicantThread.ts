import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction, MessageFlags, ThreadChannel } from "discord.js";
import Bot from "../struct/Client.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { sendDm } from "./sendDm.js";
import { Plot } from "../struct/Plot.js";
import { closeOpenPlots } from "./handlePlot.js";
import Responses from "../utils/responses.js";

async function closedApplicantThread(client: Bot, deletedThread : boolean = false, i?: Interaction, thread? : ThreadChannel) {
    //Get the thread channel
    if(!thread && i)
        thread = i.channel as ThreadChannel

    const guildData = client.guildsData.get(thread.guildId)

    //Check if thread channel is associated with a applicant thread
    const builder : BuilderInterface = await Builder.findOne({guildId: thread.guildId, 'applicantInfo.threadID': thread.id }).lean()

    let threadID : string = null
    let closed : boolean = false

    //Check if the thread was deleted
    if(deletedThread) {
        //If application was not already closed, mark is as closed
        if(builder?.applicantInfo?.closed) {
            closed = true
        }
    }else{
        threadID = builder.applicantInfo.threadId

        //If application was already closed, send reply
        if(builder?.applicantInfo?.closed) {
            if(i && i.isButton())
                return Responses.embed(i, '**The application is already closed**', guildData.accentColor)
        }else {
            closed = true
        }
    }

    //Mark the application thread id as null only if the thread was deleted, and mark it as closed
    await Builder.updateOne({ id: builder.id, guildId: builder.guildId }, { '$set' : { 'applicantInfo': { 'threadId' : threadID, 'closed' : true } } }, { upsert: true })

    if(closed) {
        //If there are any assigned plots that are not yet complete, remove their applicant 
        const plotLinks = await closeOpenPlots(client, builder, guildData)
        let plotsLinksMsg : string = ''
        if(plotLinks.length > 0) {
            for(let plotLink of plotLinks) {
                plotsLinksMsg += ` \n> - ${plotLink}`
            }
        }

        //Find the guild member of the applicant
        const builderMember = await thread.guild.members.fetch(builder.id)
        if(builderMember) {
            let builderMessage = 'Your builder application was closed'
            if(plotLinks.length) {
                builderMessage += ` \n> The following plots have been revoked: ${plotsLinksMsg}`
            }

            //Send dm to member, notifying them of the builder application closure
            await sendDm(builderMember, guildData, builderMessage, 'Builder Application Closure')

            //Find the helper guild and notify them of the user closing their application
            const helper = await thread.guild.members.fetch(builder.applicantInfo.helperId)
            if(helper) {
                let helperMessage = `**${ (!deletedThread) ? `[${thread.name}](${thread.url})` : `${thread.name}(${builderMember})`} closed their application**`
                if(plotLinks.length > 0) {
                    helperMessage += ` \n> The following open plots have been left unfinished. Clear them before resigning them: ${plotsLinksMsg}`
                }
                await sendDm(helper, guildData, helperMessage, 'Builder Application Closure')
            }
        }

        //If application was just closed but the thread was not deleted
        //send the reopen application button and the plots revoked message
        if(!deletedThread) {
            //Create a reopen button
            const reopenButton = new ButtonBuilder()
                .setCustomId('applicant_reopenapplicantion')
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
            
            return await thread.send({embeds: [Responses.createEmbed('**Builder Application Status: Closed**', guildData.accentColor).toJSON()], components: [row.toJSON()]})
        }
    }
}

/**
 * Closes the application, with the applicant thread already deleted
 * It notifies the helper and the applicant via dm of the closure while including the info
 * of any possible still open tasks left, that get closed afterwards. 
 * 
 * Ex, if any open plot is left, it notifies the helper via dm, to clear the plot on the server,
 * before using the plot again for another applicant
 * @param client The bot
 * @param thread  The deleted applicant thread
 */
async function deletedApplicantThread(client: Bot, thread: ThreadChannel) {
    await closedApplicantThread(client, true, null, thread)
}

/**
 * Closes the application, with the applicant thread still open
 * It notifies the helper and the applicant via dm of the closure while including the info
 * of any possible still open tasks left, that get closed afterwards. 
 * 
 * Ex, if any open plot is left, it notifies the helper via dm, to clear the plot on the server,
 * before using the plot again for another applicant
 * @param i The interaction that start the closure
 * @param client The bot
 * @returns An message if an error happened, else void
 */
async function closeApplicantThread(i: Interaction, client: Bot) {
    if(i && i.isButton())
        await i.deferReply({flags: MessageFlags.Ephemeral})

    return await closedApplicantThread(client, false, i)
}

export { deletedApplicantThread, closeApplicantThread }