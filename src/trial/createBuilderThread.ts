import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, GuildMember, Integration, Interaction, MessageFlags, ModalSubmitInteraction, TextChannel, TextThreadChannel, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import Bot from "../struct/Client.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { GuildInterface } from "../struct/Guild.js";
import Difficulty from "../struct/Difficulty.js";
import Responses from "../utils/responses.js";
import { insertBuilder } from "../review/insertBuilder.js";

/**
 * Create or reuses an builder thread. 
 * 
 * When the builder form reaches this point, there are x options
    1. The application already exists as it was closed in the past, but the builder thread was deleted
    2. The application already exists as it was closed in the past in the builder thread, but the thread was not deleted
    3. The application doesn't exists yet

    With option 1 and 3, threat the application as new, but with option 1, in the welcome message, 
    mark that It's a reopened application.
    With option 2, send messages to the builder thread, notifying the user of the reopening, and any new changes, 
    like a new helper (the current thread helper get replaced with the new helper)
 * @param i  The interaction of the modal with the builder info, once it get's submitted
 * @param client The bot
 * @param builderForm The info of the builder
 * @returns The ephemeral message to the link of the thread or an error (in a embed)
 */
async function createBuilderThread(i: ModalSubmitInteraction, client: Bot, builderForm: BuilderInterface) {
    const guildData = client.guildsData.get(i.guildId)
    
    let applicationWasClosed = false
    let builderThreadExists = false

    //First check if the junior builder already exists 
    let builder : BuilderInterface = await Builder.findOne({id: i.user.id, guildId: i.guildId, rank: -1}).lean()

    //Get the builders channel
    const buildersChannel = (await i.guild.channels.fetch(guildData.buildersChannel)) as TextChannel

    let builderThread : TextThreadChannel

    if(builder) {
        //If the application is marked as closed, reopen it
        if(builder?.applicationClosed) {
            applicationWasClosed = true
        }

        if(builder?.threadId) {
            builderThreadExists = true

            await buildersChannel.threads.fetch(builder.threadId).then(c => {
                builderThread = c
            }).catch(err => {
                builderThreadExists = false;
            })

            if(builderThreadExists && applicationWasClosed)
                await builderThread.setArchived(false)
        }
    }

    //Get the helper guild member
    let helper = await i.guild.members.fetch(builderForm.helperId)

    //If the builder thread doesn't exist yet, create it
    if(!builderThreadExists)
    {
        //Else create it
        builderThread = await buildersChannel.threads.create({
            name: `hub-${builderForm.mcUsername}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
            type: ChannelType.PrivateThread,
            reason: `Builder hub for player @${i.user.username}`
        })

        //Clear threads
        /*console.log('Clear threads')
        let threads = await builderChannel.threads.fetch()
        threads.threads.forEach(async (thread) => {
            console.log(`Deleting ${thread.name}`)
            await thread.delete()
        })*/

        //Add the helper and the junior builder to the thread
        await builderThread.members.add(helper)
        await builderThread.members.add(i.user)
    }

    

    //Create the welcome message
    const welcomeEmbed = createWelcomeEmbed(applicationWasClosed, helper, guildData, client, i, builderForm)

    //Create the close application button
    const closeApplicationButton = new ButtonBuilder()
        .setCustomId('builder_closeapplication')
        .setLabel('Close application')
        .setEmoji('⚠️')
        .setStyle(ButtonStyle.Danger)
    const row = new ActionRowBuilder().addComponents(closeApplicationButton)
    builderThread.send({embeds: [welcomeEmbed.toJSON()], components: [row.toJSON()]})
    
    //Check if the helper on the existing thread, is different from the new one
    if(builderThreadExists && builder.helperId != builderForm.helperId) {
        //Remove the previous helper from the thread
        await builderThread.members.remove(builder.helperId)
        //Add the new helper to the thread
        await builderThread.members.add(helper)

        await builderThread.send({embeds: [Responses.createEmbed(`**Your builder hub will now be handled by ${helper}**`, guildData.accentColor).toJSON()]})
    }

    let userMember = await i.guild.members.fetch(i.user.id)

    //Insert builder
    insertBuilder(userMember, guildData)

    //Update/upsert the builder info with the new data
    await Builder.updateOne({id: i.user.id, guildId: i.guildId}, { 
        '$set' : { 
                'mcUsername': builderForm.mcUsername, 
                'initialSelfRate' : builderForm.initialSelfRate, 
                'threadId': builderThread.id, 
                'helperId' : builderForm.helperId, 
                'applicationClosed': false
            }
        },
        { upsert : true }
    )

    if(applicationWasClosed && builderThreadExists && i) {
        //Clear the `Reopen` / `Reopen application` button from the original messages
        if(i.message)
            await i.message.edit({components: []})
        await builderThread.send('**Builder Application Status: Reopened**')
    }

    if(i.channel.isThread()) {
        return Responses.embed(i, '**Your builder application is now reopened**', guildData.accentColor)
    } else {
        return Responses.embed(i, `**Your builder application is now ready in the builder thread ${builderThread}**`, guildData.accentColor)
    }
}

function createWelcomeEmbed(applicationWasClosed : boolean, helper: GuildMember, guildData : GuildInterface, client: Bot, i: ModalSubmitInteraction, builderForm : BuilderInterface) : EmbedBuilder {
    let welcomeTitle = applicationWasClosed ? 
        `__**Welcome back to your renewed builder application**__ :wave:` :
        `__**Welcome to the start of your builder application**__ :wave:`

    let paragraphOne = applicationWasClosed ? 
        `As before, you will shortly be contacted by your chosen helper ${helper}.` : 
        `Shortly, you will be contacted by your chosen helper ${helper}`

    let paragraphTwo = applicationWasClosed ? 
        `In the meantime, feel free to share any new additional info that may have changed after you've closed your application.` :
        `In the meantime, feel free to share any additional info. Information such as where you wish to build, referrals from other teams, and pictures of builds (if you have rated yourself highly), etc.`

    let paragraphThree = applicationWasClosed ? 
        `Once you are contacted, like before, you will be given task/s to complete depending on your initial self-rate to gain minimum 8 points.` :
        `Once you are contacted, you will be given task/s to complete depending on your initial self-rate to gain minimum 8 points. \n\n${guildData.applicationFormatMsg.visitServerMsg}`

    let paragraphFour = `__*${applicationWasClosed ?`Builder new Info:` : `Builder Info:`}*__`

    const welcomeEmbed = new EmbedBuilder()
        .setTitle(welcomeTitle)
        .setDescription(`${paragraphOne} \n\n${paragraphTwo} \n\n${paragraphThree}} \n\n${paragraphFour}`)
        .setFooter({text: guildData.name, iconURL: i.guild.iconURL()})
        .setColor(`#${guildData.accentColor}`)
        .setTimestamp(new Date())
        .setImage(guildData.applicationFormatMsg.welcomeImg)
        .setFields([
            {
                name: 'Minecraft username',
                value: `${builderForm.mcUsername}`
            },
            {
                name: 'Initial self-rate',
                value: `${builderForm.initialSelfRate}/5 (${Object.values(Difficulty)[builderForm.initialSelfRate - 1]})`
            }
        ])
    
    if(applicationWasClosed && builderForm.pointsTotal > 0)
        welcomeEmbed.addFields({name: 'Total Points', value: `${builderForm.pointsTotal}/8`})
    
    return welcomeEmbed

}

export { createBuilderThread }