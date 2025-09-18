import { ThreadChannel } from "discord.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import Command from "../struct/Command.js";
import { acceptApplicant, acceptNonApplicant } from "../trial/acceptApplicant.js";
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
        const applicantUser = options.getUser('user')
        const mcUsername = options.getString('mcusername')

        let builder : BuilderInterface
        let applicantThread : ThreadChannel
        //Check if the accept was used within a thread in the applicants channel
        let isApplicantChannel = i.channel.isThread && i.channel.parentId == guildData.applicantChannel

        if(isApplicantChannel && (applicantUser || mcUsername)) {
            return Responses.embed(i, '**To accept other users, use the user and mcusername parameter outside the applicant channel**', guildData.accentColor)
        }

        if(applicantUser == null && !isApplicantChannel) {
            return Responses.embed(i, '**To accept other users, specify the user**', guildData.accentColor)
        }

        if(mcUsername == null && !isApplicantChannel) {
            return Responses.embed(i, '**To accept other users, specify their Minecraft username**', guildData.accentColor)
        }

        
        //If the command is run within the applicant thread, get the builder from the thread
        if(isApplicantChannel) {
            builder = await Builder.findOne({guildId: guildData.id, 'applicantInfo.threadId': i.channelId}).lean()

            if(builder.rank >= 0) 
                return Responses.embed(i, '**User is already a builder**', guildData.accentColor)

            applicantThread = i.channel as ThreadChannel
        }

        //If the command was run outside of the applicant thread, get the builder with applicant info from the input user
        if(!isApplicantChannel) {
            builder = await Builder.findOne({guildId: guildData.id, id: applicantUser.id}).lean()
            let applicantMember = await i.guild.members.fetch(applicantUser.id)

            if(builder?.rank >= 0) 
                return Responses.embed(i, '**User is already a builder**', guildData.accentColor)

            //If applicant is not found, try accepting them as a non-applicant (ex, if they are a builder on another team)
            if(builder == null) {
                try {
                    let res = await acceptNonApplicant(i, client, applicantUser.id, mcUsername, guildData)
                    return Responses.embed(i, res, guildData.accentColor)
                }catch(err) {
                    console.log('[AcceptNonApplicantError] ' + err)
                    return Responses.errorGeneric(i, err, guildData.accentColor, `Something went wrong while accepting ${applicantMember} user as builder`)
                }
            }
        }

        try {
            if(builder?.applicantInfo.closed)
                return Responses.embed(i, '**The application is closed**', guildData.accentColor)

            //Accept user as builder
            let res = await acceptApplicant(i, client, builder, guildData, applicantThread)
            return Responses.embed(i, res, guildData.accentColor)
        }catch(err) {
            console.log('[AcceptApplicantError] ' + err)
            return Responses.errorGeneric(i, err, guildData.accentColor, 'Something went wrong while accepting applicant as builder')
        }
    }
})