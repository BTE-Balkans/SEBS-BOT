import { ThreadChannel } from "discord.js";
import GuildPlayer, { GuildPlayerInterface } from "../struct/GuildPlayer.js";
import Command from "../struct/Command.js";
import { acceptCandidate, acceptNonCandidate } from "../trial/acceptBuilder.js";
import Responses from "../utils/responses.js";
import Application, { ApplicationInterface } from "../struct/Application.js";
import BuilderStats, { BuilderStatsInterface } from "../struct/BuilderStats.js";
import MinecraftPlayer from "../struct/MinecraftPlayer.js";

export default new Command({
    name: 'accept',
    description: 'Accept a user as builder',
    helper: true,
    args: [
        {
            name: 'user',
            description: 'User to accept as builder',
            required: false,
            optionType: 'user'
        },
        {
            name: 'mcusername',
            description: 'The Minecraft username of the to be builder',
            required: false,
            optionType: 'string'
        }
    ],
    async run(i, client) {
        const options = i.options
        const guildData = client.guildsData.get(i.guild.id)
        const builderUser = options.getUser('user')
        const mcUsername = options.getString('mcusername')

        let guildPlayer : GuildPlayerInterface
        let application : ApplicationInterface
        let builderStats : BuilderStatsInterface
        let builderThread : ThreadChannel
        //Check if the accept was used within a thread in the builders channel
        let isbuilderChannel = i.channel.isThread && i.channel.parentId == guildData.buildersChannel

        if(isbuilderChannel && (builderUser || mcUsername)) {
            return Responses.embed(i, '**To accept other users, use the user and mcusername parameter outside the builders channel**', guildData.accentColor)
        }

        if(builderUser == null && !isbuilderChannel) {
            return Responses.embed(i, '**To accept other users, specify the user**', guildData.accentColor)
        }

        if(mcUsername == null && !isbuilderChannel) {
            return Responses.embed(i, '**To accept other users, specify their Minecraft username**', guildData.accentColor)
        }

        
        //If the command is run within the builder thread, get the guild player from the application thread
        if(isbuilderChannel) {
            application = await Application.findOne({ guildId: guildData.id, 'threadId': i.channelId}).lean()
            guildPlayer = await GuildPlayer.findOne({id: application.id, guildId: guildData.id}).lean()

            if(guildPlayer.rank >= 0) 
                return Responses.embed(i, '**User is already a builder**', guildData.accentColor)

            builderThread = i.channel as ThreadChannel
        } else { //If the command was run outside of the builder thread, get the guild player info from the input user
            application = await Application.findOne({guildId: guildData.id, id: builderUser.id}).lean()
            guildPlayer = await GuildPlayer.findOne({guildId: guildData.id, id: builderUser.id}).lean()
            let builderMember = await i.guild.members.fetch(builderUser.id)

            if(guildPlayer?.rank >= 0) 
                return Responses.embed(i, '**User is already a builder**', guildData.accentColor)

            //If guild player is not found, try accepting them as a non-candidate (ex, if they are a builder on another team)
            if(guildPlayer == null) {
                try {
                    let res = await acceptNonCandidate(i, client, builderUser.id, mcUsername, guildData)
                    return Responses.embed(i, res, guildData.accentColor)
                }catch(err) {
                    console.log('[AcceptNonCandidateError] ' + err)
                    return Responses.errorGeneric(i, err, guildData.accentColor, `Something went wrong while accepting ${builderMember} user as builder`)
                }
            }
        }

        try {
            if(application?.applicationClosed)
                return Responses.embed(i, '**The builder application is closed**', guildData.accentColor)

            let minecraftPlayerUsername : string

            //If minecraft username was not provided, fetch minecraft player from candidate id
            if(mcUsername == null) {
                let minecraftPlayer = await MinecraftPlayer.findOne({id: guildPlayer.id})
                minecraftPlayerUsername = minecraftPlayer.username
            }

            let candidateStats = await BuilderStats.findOne({ id: guildPlayer.id, guildId: guildData.id })

            //Accept candidate as builder
            let res = await acceptCandidate(i, client, guildPlayer, minecraftPlayerUsername, guildData, candidateStats, application, builderThread)
            return Responses.embed(i, res, guildData.accentColor)
        }catch(err) {
            console.log('[AcceptCandidateError] ' + err)
            return Responses.errorGeneric(i, err, guildData.accentColor, 'Something went wrong while accepting user as full builder')
        }
    }
})