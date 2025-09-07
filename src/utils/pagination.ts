import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, DiscordAPIError, embedLength, InteractionEditReplyOptions, Message, MessageFlags, MessagePayload, User } from "discord.js";
import Bot from "../struct/Client.js";

export default async function(properties: PaginationOptions) {
    try {
        if(!properties.embeds || properties.embeds.length == 0 || (properties.buttons.length == 0 && properties.embeds.length > 0)) 
            return properties.interaction.editReply('Invalid pagination arguments')

        const interaction = properties.interaction
        const embeds = properties.embeds
        const author = properties.author

        if(embeds.length === 1) {
            if(properties.ephemeral) {
                return await interaction.editReply({embeds: embeds, components: []})
            }else {
                await interaction.deleteReply()
                return await interaction.channel.send({embeds: embeds, components: []})
            }
        }

        for(let x = 0; x < embeds.length; x++) {
            let em = embeds[x]
            em['footer'] = {
                text: `Page ${x + 1}/${embeds.length}` 
            }
        }

        var ind = 0

        const previous = new ButtonBuilder()
            .setCustomId(PaginationButtonType.Previous)
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        
        const next = new ButtonBuilder()
            .setCustomId(PaginationButtonType.Next)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('▶️')
        
        if(properties.buttons) {
            properties.buttons.forEach((b) => {
                let button = (b.type == PaginationButtonType.Next) ? next : previous
                if(b.emoji)
                    button.setEmoji(b.emoji)
                if(b.label)
                    button.setLabel(b.label)
                if(b.style)
                    button.setStyle(b.style)
            })
        }

        const buttons = new ActionRowBuilder().addComponents(previous, next)
        
        const message = (properties.ephemeral) ? await interaction.editReply({embeds: [embeds[ind]], components: [buttons.toJSON()]}) : 
            await interaction.channel.send({embeds: [embeds[ind]], components: [buttons.toJSON()]})

        if(!properties.ephemeral){
            await interaction.deleteReply()
        }
            
        
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: (properties.time) ? properties.time : 60 * 1000
        })

        collector.on('collect', async c => {
            if(!properties.ephemeral && c.user.id !== author.id) {
                return await c.reply({content: `This action is only allowed to **${author.username}**`, flags: MessageFlags.Ephemeral})
            }

            await c.deferUpdate()
            if(c.customId === PaginationButtonType.Next) {
                if(ind < embeds.length - 1)
                    ind++
            }else if(c.customId === PaginationButtonType.Previous) {
                if(ind > 0)
                    ind--
            }

            if(ind === embeds.length - 1) {
                next.setDisabled(true)
                previous.setDisabled(false)
            } else if(ind === 0) {
                next.setDisabled(false)
                previous.setDisabled(true)
            }else {
                next.setDisabled(false)
                previous.setDisabled(false)
            }
            
            try {
                if(properties.ephemeral) {
                    await interaction.editReply({embeds: [embeds[ind]], components: [buttons.toJSON()]})
                }else {
                    await message.edit({embeds: [embeds[ind]], components: [buttons.toJSON()]})
                }
            }catch(error) {
                console.log('[PaginationCollectorError]:')
                console.log(error) 
            }

            collector.resetTimer()
        })

        collector.on('end', async () => {
            try {
                if(properties.ephemeral) {
                    await interaction.editReply({embeds: [embeds[ind]], components: []})
                }else {
                    await message.edit({embeds: [embeds[ind]], components: []})
                }
            }catch(error) {
                console.log('[PaginationCollectorEndError]:')
                console.log(error) 
            }
        })

        return message
    }catch(err) {
        console.log(`[PaginationError]:`)
        console.log(err)
    }
}

interface PaginationOptions {
    embeds : any[],
    author: User,
    interaction: ChatInputCommandInteraction,
    client: Bot,
    ephemeral: boolean,
    time?: number,
    buttons?: PaginationButton[]
}

interface PaginationButton {
    type: PaginationButtonType
    label?: string
    emoji?: string
    style?: ButtonStyle
}

enum PaginationButtonType {
    Previous = 'previousPage',
    Next = 'nextPage'
}

export { PaginationOptions, PaginationButton, PaginationButtonType}

