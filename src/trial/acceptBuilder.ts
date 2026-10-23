import { Interaction, TextChannel, ThreadChannel } from "discord.js";
import { GuildInterface, SystemRole } from "../struct/Guild.js";
import GuildPlayer, { GuildPlayerInterface } from "../struct/GuildPlayer.js";
import Bot from "../struct/Client.js";
import Responses from "../utils/responses.js";
import { ApplicationInterface } from "../struct/Application.js";
import { BuilderStatsInterface } from "../struct/BuilderStats.js";
import MinecraftPlayer, { MinecraftPlayerInterface } from "../struct/MinecraftPlayer.js";
import { sendDm } from "./sendDm.js";
import { getMinecraftProfile } from "../utils/ensureBuilderMinecraftUsername.js";
import { getBuilderRankFromRoles, getBuilderRoleFromRank } from "../utils/getBuilderRankFromRoles.js";
import { getOpenPlots } from "./handlePlot.js";
import insertGuildPlayer from "../utils/insertGuildPlayer.js";
import { closeApplication } from "./closeApplication.js";



async function acceptAsBuilder(i: Interaction, client: Bot, candidateId: string, mcUsername: string, guildData: GuildInterface, candidate?: GuildPlayerInterface, candidateStats?: BuilderStatsInterface, application?: ApplicationInterface, builderThread?: ThreadChannel) : Promise<string> {
    //Check if the interaction user is the helper of the user, if the candidate and builder application exists
    if(candidate && application?.helperId != i.user.id) {
        return '**Helper is not assigned to user**'
    }

    //Check if candidate is already a builder, by checking if they have any of the builder roles, if the candidate exists
    const candidateMember = await i.guild.members.fetch(candidateId)
    if(candidate && candidateMember.roles.cache.hasAny(guildData.rank1.id, guildData.rank2.id, guildData.rank3.id, guildData.rank4.id, guildData.rank5.id)) {    
        return '**User is already a full builder**'
    }

    //If builder thread is null, fetch it if the candidate and application exists
    if(candidate && application.threadId && builderThread == null) {
        const builderChannel = await i.guild.channels.fetch(guildData.buildersChannel) as TextChannel
        builderThread = await builderChannel.threads.fetch(application.threadId)
    }

    //Check if candidate has any open plots left to be reviewed
    if(candidate && application) {
        const plots = await getOpenPlots(application, guildData)
        if(plots.length > 0) {
            let openPlotsMsg = `The builder ${candidateMember} has open plots left: `
            const plotChannel = await i.guild.channels.fetch(guildData.plotsChannel) as TextChannel
            for(let plot of plots) {
                const plotMsg = await plotChannel.messages.fetch(plot.id)
                openPlotsMsg += ` \n> - [\`${plot.address}\`](${plotMsg.url})`
            }

            return `${openPlotsMsg} \n\nReview them with \`/task review <plot-id>\``
        }


        if(candidateStats.pointsTotal < 8) {
            return `**The candidate builder must obtain 8 points to be accepted as a builder (Currently at ${candidateStats.pointsTotal} points)**`
        }
    }

    //Get the submission channel
    const submissionChannel = await i.guild.channels.fetch(guildData.submitChannel) as TextChannel
    
    let paragraphOne = `You've been accepted as a builder. You can now build on the server and submit your builds to ${submissionChannel} to raise up the ranks.`
    let paragraphTwo = `> ✨ Remember to check out the [submission format](${guildData.formattingMsg}), on how to format your submission message.`
    let paragraphThree = 'This private thread will remain open until further to enable any possible future help.'

    let starterRole = await getBuilderRoleFromRank(0, i.guild, guildData)

    if(candidate) {
        //Add the starter role to member
        await candidateMember.roles.add(starterRole)

        //Update the now builder to rank 0
        await GuildPlayer.updateOne({id: candidateId, guildId: guildData.id}, {$addToSet: { 'roles': SystemRole.Builder }, $set: { 'rank': 0}})

        //Mark the application as closed
        await closeApplication(i, client)
        
        //Send message to builder thread and dm of member 
        await builderThread.send({embeds: [Responses.createEmbed(`${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree}`, guildData.accentColor, 'Congratulations!' ).toJSON()]})
    
        await sendDm(candidateMember, guildData, `${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree}`, 'Congratulations')
    } else {
        let minecraftProfileName : string
        let minecraftProfileUUID : string
        try {
            let minecraftProfile = await getMinecraftProfile(mcUsername)
            if('error' in minecraftProfile)
                return `**Could not find Minecraft profile for \`${mcUsername}\` username:** \n${minecraftProfile.error}`

            minecraftProfileName = minecraftProfile.name
            minecraftProfileUUID = minecraftProfile.uuid
        }catch(err) {
            return `**Error while fetching Minecraft profile info:** \n${err}`
        }

        let rank = getBuilderRankFromRoles(candidateMember, guildData)
        //If member doesn't have a rank yet, add the starter role to member
        if(rank == -1)
            await candidateMember.roles.add(starterRole)


        //if candidate guild player is null it means the member to be accepted as builder was accepted through other means then the trial system
        await insertGuildPlayer(candidateMember, guildData, SystemRole.Builder, rank)

        //Set the minecraft player of the now builder
        await MinecraftPlayer.updateOne({ id: candidateId }, {$set: { 'uuid': minecraftProfileUUID, 'username': minecraftProfileName }}, { upsert: true }) 
        //Send the now builder a dm
        await sendDm(candidateMember, guildData, `${paragraphOne} \n\n${paragraphTwo}`, 'Congratulations')
    }

    return `**The user ${candidateMember} has been accepted as a full builder**`
}

async function acceptCandidate(i: Interaction, client: Bot, candidate: GuildPlayerInterface, mcUsername: string, guildData: GuildInterface, candidateStats?: BuilderStatsInterface, application?: ApplicationInterface, builderThread?: ThreadChannel) : Promise<string> {
    return acceptAsBuilder(i, client, candidate.id, mcUsername, guildData, candidate, candidateStats, application, builderThread)
}

async function acceptNonCandidate(i: Interaction, client: Bot, userId: string, mcUsername: string, guildData: GuildInterface) : Promise<string> {
    return acceptAsBuilder(i, client, userId, mcUsername, guildData)
}



export { acceptCandidate, acceptNonCandidate}