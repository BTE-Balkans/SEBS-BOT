import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, GuildMember, Integration, Interaction, MessageFlags, ModalSubmitInteraction, TextChannel, TextThreadChannel, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import Bot from "../struct/Client.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { GuildInterface } from "../struct/Guild.js";
import Difficulty from "../struct/Difficulty.js";
import Responses from "../utils/responses.js";
import { insertBuilder } from "../review/insertBuilder.js";

/**
 * Create or reuses an applicant thread. 
 * 
 * When the application form reaches this point, there are x options
    1. The application already exists as it was closed in the past, but the thread was deleted
    2. The application already exists as it was closed in the past in the thread, but the thread was not deleted
    3. The application doesn't exists yet

    With option 1 and 3, threat the application as new, but with option 1, in the welcome message, 
    mark that It's a reopened application.
    With option 2, send messages to the applicant thread, notifying the user of the reopening, and any new changes, 
    like a new helper (replace the current thread helper with the new helper)
 * @param i  The interaction of the modal with the applicant info, once it get's submitted
 * @param client The bot
 * @param builderForm The applicant info of the to be builder
 * @returns The ephemeral message to the link of the thread or an error (in a embed)
 */
async function createApplicantThread(i: ModalSubmitInteraction, client: Bot, builderForm: BuilderInterface) {
    const guildData = client.guildsData.get(i.guildId)
    
    let applicantWasClosed = false
    let applicantThreadExists = false

    //First check if the applicant already exists 
    let builder : BuilderInterface = await Builder.findOne({id: i.user.id, guildId: i.guildId, rank: -1}).lean()

    //Get the application channel
    const applicantChannel = (await i.guild.channels.fetch(guildData.applicantChannel)) as TextChannel

    let applicantThread : TextThreadChannel

    if(builder) {
        //If the application is marked as closed, reopen it
        if(builder.applicantInfo?.closed) {
            applicantWasClosed = true
        }

        if(builder.applicantInfo?.threadId) {
            applicantThreadExists = true

            await applicantChannel.threads.fetch(builder.applicantInfo.threadId).then(c => {
                applicantThread = c
            }).catch(err => {
                applicantThreadExists = false;
            })

            if(applicantThreadExists && applicantWasClosed)
                await applicantThread.setArchived(false)
        }
    }

    //Get the helper guild member
    let helper = await i.guild.members.fetch(builderForm.applicantInfo.helperId)

    //Get the applicant thread, else create it
    if(!applicantThreadExists)
    {
        //Else create it
        applicantThread = await applicantChannel.threads.create({
            name: `applicant-${builderForm.mcUsername}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
            type: ChannelType.PrivateThread,
            reason: `Application thread for applicant @${i.user.username}`
        })

        //Clear threads
        /*console.log('Clear threads')
        let threads = await applicantChannel.threads.fetch()
        threads.threads.forEach(async (thread) => {
            console.log(`Deleting ${thread.name}`)
            await thread.delete()
        })*/

        //Add the helper and the applicant to the thread
        await applicantThread.members.add(helper)
        await applicantThread.members.add(i.user)
    }

    

    //Send a welcome message
    const welcomeEmbed = createWelcomeEmbed(applicantWasClosed, helper, guildData, client, i, builderForm)

    //Create the close application button
    const closeApplicationButton = new ButtonBuilder()
        .setCustomId('applicant_closeapplication')
        .setLabel('Close application')
        .setEmoji('⚠️')
        .setStyle(ButtonStyle.Danger)
    const row = new ActionRowBuilder().addComponents(closeApplicationButton)
    applicantThread.send({embeds: [welcomeEmbed.toJSON()], components: [row.toJSON()]})
    
    //Check if the existing helper on the thread, is different from the new one
    if(applicantThreadExists && builder.applicantInfo.helperId != builderForm.applicantInfo.helperId) {
        //Remove the previous helper from the thread
        await applicantThread.members.remove(builder.applicantInfo.helperId)
        //Add the new helper to the thread
        await applicantThread.members.add(helper)

        await applicantThread.send({embeds: [Responses.createEmbed(`**Your application will now be handled by ${helper}**`, guildData.accentColor).toJSON()]})
    }

    let userMember = await i.guild.members.fetch(i.user.id)

    //Insert builder
    insertBuilder(userMember, guildData)

    //Update/upsert the builder application info with the new data
    await Builder.updateOne({id: i.user.id, guildId: i.guildId}, { 
        '$set' : { 
            'mcUsername': builderForm.mcUsername, 
            'applicantInfo': {
                'initialSelfRate' : builderForm.applicantInfo.initialSelfRate, 
                'threadId': applicantThread.id, 
                'helperId' : builderForm.applicantInfo.helperId, 
                'closed' : false 
            }}
        },
        { upsert : true }
    )

    if(applicantWasClosed && applicantThreadExists && i) {
        //Clear the `Reopen` / `Reopen application` button from the original messages
        if(i.message)
            await i.message.edit({components: []})
        await applicantThread.send('**Builder Application Status: Reopened**')
    }

    if(i.channel.isThread()) {
        return Responses.embed(i, '**You application is now reopened**', guildData.accentColor)
    } else {
        return Responses.embed(i, `**Your application is now ready in the thread ${applicantThread}**`, guildData.accentColor)
    }
}

function createWelcomeEmbed(applicantWasClosed : boolean, helper: GuildMember, guildData : GuildInterface, client: Bot, i: ModalSubmitInteraction, builderForm : BuilderInterface) : EmbedBuilder {
    let welcomeTitle = applicantWasClosed ? 
        `__**Welcome back to your renewed builder application**__ :wave:` :
        `__**Welcome to the start of your builder application**__ :wave:`

    let paragraphOne = applicantWasClosed ? 
        `As before, you will shortly be contacted by your chosen helper ${helper}.` : 
        `Shortly, you will be contacted by your chosen helper ${helper}`

    let paragraphTwo = applicantWasClosed ? 
        `In the meantime, feel free to share any new additional info that may have changed after you've closed your application.` :
        `In the meantime, feel free to share any additional info. Information such as where you wish to build, referrals from other teams, and pictures of builds (if you have rated yourself highly), etc.`

    let paragraphThree = applicantWasClosed ? 
        `Once you are contacted, like before, you will be given task/s to complete depending on your initial self-rate to gain minimum 8 points.` :
        `Once you are contacted, you will be given task/s to complete depending on your initial self-rate to gain minimum 8 points. \n\n${guildData.applicantFormatMsg.visitServerMsg}`

    let paragraphFour = `__*${applicantWasClosed ?`Applicant new Info:` : `Applicant Info:`}*__`

    const welcomeEmbed = new EmbedBuilder()
        .setTitle(welcomeTitle)
        .setDescription(`${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree}} \n\n${paragraphFour}`)
        .setFooter({text: guildData.name, iconURL: i.guild.iconURL()})
        .setColor(`#${guildData.accentColor}`)
        .setTimestamp(new Date())
        .setImage(guildData.applicantFormatMsg.welcomeImg)
        .setFields([
            {
                name: 'Minecraft username',
                value: `${builderForm.mcUsername}`
            },
            {
                name: 'Initial self-rate',
                value: `${builderForm.applicantInfo.initialSelfRate}/5 (${Object.values(Difficulty)[builderForm.applicantInfo.initialSelfRate - 1]})`
            }
        ])
    
    if(applicantWasClosed && builderForm.pointsTotal > 0)
        welcomeEmbed.addFields({name: 'Total Points', value: `${builderForm.pointsTotal}/8`})
    
    return welcomeEmbed

}

export { createApplicantThread }