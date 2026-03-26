import { Interaction, TextChannel, ThreadChannel } from "discord.js";
import { HelperInterface } from "../struct/Helper.js";
import { GuildInterface } from "../struct/Guild.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { insertBuilder } from "../review/insertBuilder.js";
import { closeApplication } from "./closeApplication.js";
import Bot from "../struct/Client.js";
import Responses from "../utils/responses.js";
import { sendDm } from "./sendDm.js";
import { Plot } from "../struct/Plot.js";
import { checkMinecraftUsername } from "../utils/ensureBuilderMinecraftUsername.js";
import { getBuilderRankFromRoles, getBuilderRoleFromRank } from "../utils/getBuilderRankFromRoles.js";
import { getOpenPlots } from "./handlePlot.js";


async function acceptAsBuilder(i: Interaction, client: Bot, candidateId: string, mcUsername: string, guildData: GuildInterface, builder?: BuilderInterface, builderThread?: ThreadChannel) : Promise<string> {
    //Check if the interaction user is the helper of the user, if the builder exists
    if(builder && builder?.helperId != i.user.id) {
        return '**Helper is not assigned to user**'
    }

    //Check if candidate is already a full builder, by checking if they have any of the builder roles, if the builder exists
    const candidateMember = await i.guild.members.fetch(candidateId)
    if(builder && candidateMember.roles.cache.hasAny(guildData.rank1.id, guildData.rank2.id, guildData.rank3.id, guildData.rank4.id, guildData.rank5.id)) {    
        return '**User is already a full builder**'
    }

    //If builder thread is null, fetch it if the builder exists
    if(builder && builder.threadId && builderThread == null) {
        const builderChannel = await i.guild.channels.fetch(guildData.buildersChannel) as TextChannel
        builderThread = await builderChannel.threads.fetch(builder.threadId)
    }

    //Check if builder has any open plots left to be reviewed
    if(builder) {
        const plots = await getOpenPlots(builder, guildData)
        if(plots.length > 0) {
            let openPlotsMsg = `The builder ${candidateMember} has open plots left: `
            const plotChannel = await i.guild.channels.fetch(guildData.plotsChannel) as TextChannel
            for(let plot of plots) {
                const plotMsg = await plotChannel.messages.fetch(plot.id)
                openPlotsMsg += ` \n> - [\`${plot.address}\`](${plotMsg.url})`
            }

            return `${openPlotsMsg} \n\nReview them with \`/task review <plot-id>\``
        }


        if(builder.pointsTotal < 8) {
            return `**The junior builder must obtain 8 points to be accepted as a full builder (Currently at ${builder.pointsTotal} points)**`
        }
    }

    //Get the submission channel
    const submissionChannel = await i.guild.channels.fetch(guildData.submitChannel) as TextChannel
    
    let paragraphOne = `You've been accepted as a full builder. You can now build on the server and submit your builds to ${submissionChannel} to raise up the ranks.`
    let paragraphTwo = `> ✨ Remember to check out the [submission format](${guildData.formattingMsg}), on how to format your submission message.`
    let paragraphThree = 'This private thread will remain open until further to enable any possible future help.'

    let starterRole = await getBuilderRoleFromRank(0, i.guild, guildData)

    if(builder) {
        //Add the starter role to member
        await candidateMember.roles.add(starterRole)

        //Update the now full builder to rank 0
        await Builder.updateOne({id: candidateId, guildId: guildData.id}, {$set: { 'rank': 0}})

        //Mark the application as closed
        await closeApplication(i, client)
        
        //Send message to builder thread and dm of member 
        await builderThread.send({embeds: [Responses.createEmbed(`${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree}`, guildData.accentColor, 'Congratulations!' ).toJSON()]})
    
        await sendDm(candidateMember, guildData, `${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree}`, 'Congratulations')
    } else {
        try {
            let res = await checkMinecraftUsername(mcUsername)
            if(!res)
                return `**Could not find Minecraft profile for \`${mcUsername}\` username**`
        }catch(err) {
            return `**Error while fetching Minecraft profile info:** \n${err}`
        }

        let rank = getBuilderRankFromRoles(candidateMember, guildData)
        //If member doesn't have a rank yet, add the starter role to member
        if(rank == -1)
            await candidateMember.roles.add(starterRole)


        //if builder is null it means the member to be accepted as full builder was accepted through other means then the trial system
        await insertBuilder(candidateMember, guildData)

        //Update the now full builder with the member Minecraft username
        await Builder.updateOne({id: candidateId, guildId: guildData.id}, {$set: { 'mcUsername': mcUsername }}) 
        //Else send the now builder a dm
        await sendDm(candidateMember, guildData, `${paragraphOne} \n\n${paragraphTwo}`, 'Congratulations')
    }

    return `**The user ${candidateMember} has been accepted as a full builder**`
}

async function acceptCandidate(i: Interaction, client: Bot, builder: BuilderInterface, guildData: GuildInterface, builderThread?: ThreadChannel) : Promise<string> {
    return acceptAsBuilder(i, client, builder.id, builder.mcUsername, guildData, builder, builderThread)
}

async function acceptNonCandidate(i: Interaction, client: Bot, userId: string, mcUsername: string, guildData: GuildInterface) : Promise<string> {
    return acceptAsBuilder(i, client, userId, mcUsername, guildData)
}



export { acceptCandidate, acceptNonCandidate}