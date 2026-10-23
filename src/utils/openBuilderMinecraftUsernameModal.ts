import { ActionRowBuilder, ButtonInteraction, LabelBuilder, ModalBuilder, resolveColor, TextInputBuilder, TextInputStyle } from "discord.js";
import Bot from "../struct/Client.js";
import GuildPlayer from "../struct/GuildPlayer.js";
import MinecraftPlayer from "../struct/MinecraftPlayer.js";
import { GuildInterface, SystemRole } from "../struct/Guild.js";
import { getBuilderRankFromRoles } from "./getBuilderRankFromRoles.js";
import insertGuildPlayer from "./insertGuildPlayer.js";
import Responses from "./responses.js";

/**
 * Opens the modal requesting the builder of their Minecraft username and sets the builder Minecraft username in the system.
 * Ex, if a builder wasn't added through the application system, but they want to submit a build. 
 * But since their profile is not complete, it posts an request message with a button, 
 * that request the Minecraft username from them
 * @param client The bot
 * @param i The said button interaction from the request message
 * @returns The ephemeral message notifying the builder of the update (in a embed)
 */
async function openBuilderMinecraftUsernameModal(client: Bot, i: ButtonInteraction) {
    const guild = await client.guilds.fetch(client.guildProductionID)

    const modal = new ModalBuilder()
        .setCustomId('builderform_modal')
        .setTitle('Builder Info')

    const minecraftUsernameInput = new TextInputBuilder()
        .setCustomId('builderform_minecraftusername')
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
    const minecraftUsernameInputLabel = new LabelBuilder({label: 'What is your Minecraft username?'})
        .setTextInputComponent(minecraftUsernameInput)

    modal.addLabelComponents(minecraftUsernameInputLabel.toJSON())
    await i.showModal(modal, {withResponse: true})

    try {
        const res = await i.awaitModalSubmit({filter: interaction => { return interaction.customId == 'builderform_modal' }, time: 5 * 60 * 1000})
        await res.deferReply()

        const mcUsername = res.fields.getTextInputValue('builderform_minecraftusername')

        const guildData = client.guildsData.get(client.guildProductionID)
        //Get guild member of user
        const member = await guild.members.fetch(i.user.id)

        //Find if guild member has any builder rank, and get It's rank index [0-4]
        //This is done because if a builder doesn't have a Minecraft username set yet, It is assumed they are an existing builder for the guild
        let rank = getBuilderRankFromRoles(member, guildData)
        
        //Update the builder minecraft username and rank
        await MinecraftPlayer.updateOne({id: i.user.id}, {'username': mcUsername}, {upsert: true})
        if(rank == -1) 
            await GuildPlayer.updateOne({id: i.user.id, guildId: guildData.id}, {}, {upsert: true})
        else
            await GuildPlayer.updateOne({id: i.user.id, guildId: guildData.id}, { '$addToSet': { 'roles': SystemRole.Builder }, '$set': { 'rank': rank } }, {upsert: true})
        
        await i.editReply({components: []})
        return Responses.minecraftUsernameUpdated(res, mcUsername, guildData, guildData.accentColor)

    }catch(err) {
        console.log(err)
    }
    
}

export { openBuilderMinecraftUsernameModal}