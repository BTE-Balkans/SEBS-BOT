import { ThreadChannel } from "discord.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import Command from "../struct/Command.js";
import { acceptCandidate, acceptNonCandidate } from "../trial/acceptBuilder.js";
import Responses from "../utils/responses.js";

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

        let builder : BuilderInterface
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

        
        //If the command is run within the builder thread, get the builder from the thread
        if(isbuilderChannel) {
            builder = await Builder.findOne({guildId: guildData.id, 'threadId': i.channelId}).lean()

            if(builder.rank >= 0) 
                return Responses.embed(i, '**User is already a builder**', guildData.accentColor)

            builderThread = i.channel as ThreadChannel
        }

        //If the command was run outside of the builder thread, get the builder info from the input user
        if(!isbuilderChannel) {
            builder = await Builder.findOne({guildId: guildData.id, id: builderUser.id}).lean()
            let builderMember = await i.guild.members.fetch(builderUser.id)

            if(builder?.rank >= 0) 
                return Responses.embed(i, '**User is already a builder**', guildData.accentColor)

            //If builder is not found, try accepting them as a non-candidate (ex, if they are a builder on another team)
            if(builder == null) {
                try {
                    let res = await acceptNonCandidate(i, client, builderUser.id, mcUsername, guildData)
                    return Responses.embed(i, res, guildData.accentColor)
                }catch(err) {
                    console.log('[AcceptNonCandidateError] ' + err)
                    return Responses.errorGeneric(i, err, guildData.accentColor, `Something went wrong while accepting ${builderMember} user as full builder`)
                }
            }
        }

        try {
            if(builder?.applicationClosed)
                return Responses.embed(i, '**The builder application is closed**', guildData.accentColor)

            //Accept user as builder
            let res = await acceptCandidate(i, client, builder, guildData, builderThread)
            return Responses.embed(i, res, guildData.accentColor)
        }catch(err) {
            console.log('[AcceptCandidateError] ' + err)
            return Responses.errorGeneric(i, err, guildData.accentColor, 'Something went wrong while accepting user as full builder')
        }
    }
})