import {APILabelComponent, ButtonInteraction, LabelBuilder, MessageFlags, ModalBuilder, Snowflake, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } from "discord.js";
import Bot from "../struct/Client.js";
import Helper, { HelperInterface } from "../struct/Helper.js";
import Difficulty from "../struct/Difficulty.js";
import { createBuilderThread } from "./createBuilderThread.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import DifficultyEmoji from "../utils/difficultyEmoji.js";
import Responses from "../utils/responses.js";
import { checkMinecraftUsername } from "../utils/ensureBuilderMinecraftUsername.js";
import { getBuilderRankFromRoles } from "../utils/getBuilderRankFromRoles.js";
import { acceptNonCandidate } from "./acceptBuilder.js";
import { createDifficultySelectMenuOptions } from "../utils/createDifficultySelectMenuOptions.js";

/**
 * Opens a modal which request the info for new or existing application from the builder
 * @param i The button interaction that started the action, ex after an user confirms they have an legal copy of Minecraft 
 * @param client The bot
 * @returns An ephemeral message with a embed, notifying the builder of the link to the application thread, 
 * else of any possible error
 */
async function openBuilderForm(i : ButtonInteraction, client: Bot) {
    const guildData = client.guildsData.get(i.guildId)
    const member = await i.guild.members.fetch(i.user.id)
    
    //Get member rank from 0 to 4 else -1
    let memberRank = getBuilderRankFromRoles(member, guildData)
    //If the member rank is greater than -1, the member already has a builder role
    let hasBuilderRole = memberRank > -1


    let builder : BuilderInterface
    //If member already has a builder role check if they are already registered as builder
    //This is done to check if they have not yet set their MC username and thus are not yet fully registered
    if(hasBuilderRole)
        builder = await Builder.findOne({id: i.user.id, guildId: i.guildId}).lean()

    let modalLabels : APILabelComponent[] = []

    //Only create the full builder form if user doesn't have a builder role
    if(!hasBuilderRole) {
        //Get helpers
        const helpers = await Helper.aggregate([
            {
                $match: {
                    guildId: guildData.id,
                    inactive: false,
                    id: { $ne: i.user.id} //Prevent the the interaction using being the helper 
                }
            },
            {
                $lookup: {
                    from: 'builders',
                    let: {helperId: '$id'},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$helperId", "$$helperId"] },
                                        { $eq: ["$guildId", i.guildId] },
                                        { $eq: ["$applicationClosed", false] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'builders'
                }
            },
            {
                $project: {
                    "id": 1,
                    openApplications: { $size: "$builders" }
                }
            },
            {
                $sort: {
                    openApplications: 1
                }
            }
        ])

        const selectHelperUser = new StringSelectMenuBuilder()
                .setCustomId('builderform_selecthelper')
                .setPlaceholder('Select helper')

        for(let helper of helpers) {
            //Get guild member 
            const guildMember = await i.guild.members.fetch(helper.id)
            if(guildMember) {
                selectHelperUser.addOptions(
                    new StringSelectMenuOptionBuilder({
                        label: `${guildMember.displayName} (#${guildMember.user.username})`,
                        description: `${helper.openApplications} open applications`,
                        value: guildMember.id
                    })
                )
            }
        }

        const selectHelperUserLabel = new LabelBuilder()
            .setLabel('Select helper to handle your application')
            .setDescription('Helpers with more applications open, will take more time to respond')
            .setStringSelectMenuComponent(selectHelperUser)

        const selfRateOptions = createDifficultySelectMenuOptions(true, 1)

        const selectSelfRate = new StringSelectMenuBuilder()
            .setCustomId('builderform_selfrate')
            .setPlaceholder('Select from 1 to 5')
            .addOptions(selfRateOptions)

        const selectSelfRateLabel = new LabelBuilder()
            .setLabel('How do you rank yourself as a builder?')
            .setStringSelectMenuComponent(selectSelfRate)

        modalLabels.push(selectHelperUserLabel.toJSON(), selectSelfRateLabel.toJSON())
    }

    const minecraftUsernameInput = new TextInputBuilder()
        .setCustomId('builderform_minecraftusername')
        .setRequired(true)
        .setStyle(TextInputStyle.Short)

    const minecraftUsernameLabel = new LabelBuilder()
        .setLabel('What is your Minecraft username?')
        .setTextInputComponent(minecraftUsernameInput)

    modalLabels.push(minecraftUsernameLabel.toJSON())

    /*const filter = inter => {
        inter.deferUpdate()
        return inter.user.id === i.user.id
    }*/

    const modal = new ModalBuilder()
        .setCustomId('builderform_modal')
        .setTitle('Builder Form')
        .addLabelComponents(modalLabels)

    try {
        await i.showModal(modal, {withResponse: true})
        await i.deleteReply()

        const res = await i.awaitModalSubmit({filter: interaction => interaction.customId == 'builderform_modal', time: 5 * 60 * 1000})
        await res.deferReply({flags: MessageFlags.Ephemeral})
        const mcUsername = res.fields.getTextInputValue('builderform_minecraftusername')

        //Validate Minecraft username
        let validMcUsername = await checkMinecraftUsername(mcUsername)
        if(!validMcUsername)
            return res.editReply({embeds: [ Responses.createEmbed(`**Invalid Minecraft username:** ${mcUsername}`, guildData.accentColor).toJSON() ], components: []})

        //If user already has a builder role but they didn't yet full register (set their MC username), 
        // accept them as as full builder and not as an junior builder
        if(hasBuilderRole && !builder?.mcUsername) {
            //If builder isn't yet registered accept them using the Minecraft username
            if(!builder) {
                let acceptRes = await acceptNonCandidate(i, client, i.user.id, mcUsername, guildData)
                return Responses.embed(res, acceptRes, guildData.accentColor)
            } else if(builder && !builder.mcUsername) {
                //Else if the builder is registered, but doesn't have their Minecraft username yet set, 
                //update their builder info
                await Builder.updateMany({id: builder.id}, {$set: {'mcUsername': mcUsername}})
                return Responses.minecraftUsernameUpdated(res, mcUsername, guildData, guildData.accentColor)
            }

            //User is already a fully registered builder and has their MC username set
            return Responses.userAlreadyBuilder(res, guildData.accentColor)
        }

        const helperId = res.fields.getStringSelectValues('builderform_selecthelper').join()
        const selfRate = parseInt(res.fields.getStringSelectValues('builderform_selfrate').join())

        //Temp builder form data
        let builderForm : BuilderInterface = { 
            id: i.user.id, 
            guildId : i.guildId, 
            mcUsername: mcUsername, 
            rank: -1, 
            dm: true, 
            pointsTotal: 0, 
            buildingCount: 0, 
            soloBuilds: 0, 
            contributions: 0, 
            roadKMs: 0, 
            sqm: 0, 
            initialSelfRate: selfRate, 
            threadId : null, 
            helperId : helperId, 
            applicationClosed : false
        }
        
        
        //Create the builder thread
        return await createBuilderThread(res, client, builderForm)
    } catch(err) {
        if(err.code != 'InteractionCollectorError') {
            console.log(`[openBuilderFormError]: \n > ${err}`)
        }
        
        return await i.editReply({embeds: [ Responses.createEmbed(`**Builder Form Error:**\n ${err}`, guildData.accentColor).toJSON()], components: []})
    }
}

export { openBuilderForm }