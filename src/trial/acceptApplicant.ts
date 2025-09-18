import { Interaction, TextChannel, ThreadChannel } from "discord.js";
import { HelperInterface } from "../struct/Helper.js";
import { GuildInterface } from "../struct/Guild.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { insertBuilder } from "../review/insertBuilder.js";
import { closeApplicantThread } from "./closeApplicantThread.js";
import Bot from "../struct/Client.js";
import Responses from "../utils/responses.js";
import { sendDm } from "./sendDm.js";
import { Plot } from "../struct/Plot.js";
import { checkMinecraftUsername } from "../utils/ensureBuilderMinecraftUsername.js";


async function acceptAsBuilder(i: Interaction, client: Bot, applicantId: string, mcUsername: string, guildData: GuildInterface, builder?: BuilderInterface, applicantThread?: ThreadChannel) : Promise<string> {
    //Check if the user is the helper of the applicant, if the applicant exists
    if(builder && builder?.applicantInfo?.helperId != i.user.id) {
        return '**Helper is not assigned to applicant**'
    }

    //Prevent the helper self-accepting
    /*if(builder && builder?.applicantInfo && builder?.applicantInfo?.helperId == i.user.id && i.user.id == builder.id  || applicantId == i.user.id)
        return '**Cannot self accept as builder**'*/

    //Check if applicant is already a builder, by checking if they have any of the builder roles
    const applicantMember = await i.guild.members.fetch(applicantId)
    if(builder && applicantMember.roles.cache.hasAny(guildData.rank1.id, guildData.rank2.id, guildData.rank3.id, guildData.rank4.id, guildData.rank5.id)) {    
        return '**User is already a builder**'
    }

    //If applicant thread is null, fetch it, if applicant exists
    if(builder && builder?.applicantInfo && applicantThread == null) {
        const applicantChannel = await i.guild.channels.fetch(guildData.applicantChannel) as TextChannel
        applicantThread = await applicantChannel.threads.fetch(builder.applicantInfo.threadId)
    }

    //Check if applicant has any open plots left to be reviewed
    if(builder?.applicantInfo) {
        //Check if applicant has any open plots left to be reviewed
        const plots = await Plot.find({guildId: guildData.id, applicant: applicantId, complete: null})
        if(plots.length > 0) {
            let openPlotsMsg = `The applicant ${applicantMember} has open plots left: `
            const plotChannel = await i.guild.channels.fetch(guildData.plotsChannel) as TextChannel
            for(let plot of plots) {
                const plotMsg = await plotChannel.messages.fetch(plot.id)
                openPlotsMsg += ` \n> - [\`${plot.address}\`](${plotMsg.url})`
            }

            return `${openPlotsMsg} \n\nReview them with \`/task review <plot-id>\``
        }


        if(builder.pointsTotal < 8) {
            return `**The applicant must obtain 8 points to be accepted as builder (Currently at ${builder.pointsTotal} points)**`
        }
    }

    //Get the submission channel
    const submissionChannel = await i.guild.channels.fetch(guildData.submitChannel) as TextChannel
    
    let paragraphOne = `You've been accepted as a builder. You can now build on the server and submit your builds to ${submissionChannel} to raise up the ranks.`
    let paragraphTwo = `> ✨ Remember to check out the [submission format](${guildData.formattingMsg}), on how to format your submission message.`
    let paragraphThree = 'This private thread will remain open until further to enable any possible future help.'
        
    if(builder?.applicantInfo) {
        
        //Mark the application as closed
        await closeApplicantThread(i, client)
        
        //Send message to thread and applicant dm 
        await applicantThread.send({embeds: [Responses.createEmbed(`${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree}`, guildData.accentColor, 'Congratulations!' ).toJSON()]})
    
        await sendDm(applicantMember, guildData, `${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree}`, 'Congratulations')
    } else {
        try {
            let res = await checkMinecraftUsername(mcUsername)
            if(!res)
                return `**Could not find Minecraft profile for \`${mcUsername}\` username**`
        }catch(err) {
            return `**Error while fetching Minecraft profile info:** \n${err}`
        }

        //if builder is null it means the member to be accepted as builder was accepted through other means then the trial system
        await insertBuilder(applicantMember, guildData)

        //Update the now builder with the members Minecraft username
        await Builder.updateOne({id: applicantId, guildId: guildData.id}, {$set: { 'mcUsername': mcUsername }}) 
        //Else send the now builder a dm
        await sendDm(applicantMember, guildData, `${paragraphOne} \n\n${paragraphTwo}`, 'Congratulations')
    }

    return `**The user ${applicantMember} has been accepted as builder**`
}

async function acceptApplicant(i: Interaction, client: Bot, builder: BuilderInterface, guildData: GuildInterface, applicantThread?: ThreadChannel) : Promise<string> {
    return acceptAsBuilder(i, client, builder.id, builder.mcUsername, guildData, builder, applicantThread)
}

async function acceptNonApplicant(i: Interaction, client: Bot, applicantId: string, mcUsername: string, guildData: GuildInterface) : Promise<string> {
    return acceptAsBuilder(i, client, applicantId, mcUsername, guildData)
}



export { acceptApplicant, acceptNonApplicant}