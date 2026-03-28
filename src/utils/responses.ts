import { BaseInteraction, ButtonInteraction, ComponentType, ContainerBuilder, EmbedBuilder, Interaction, resolveColor, TextDisplayBuilder, User } from "discord.js"

namespace Responses {

    // SUBMISSION AREA

    export function invalidSubmissionID(interaction, submissionID, accentColor?: string) {
        return embed(interaction, `'${submissionID}' is not a valid message ID from the build submit channel.`, accentColor)
    }

    export function submissionHasAlreadyBeenAccepted(interaction, accentColor?: string) {
        return embed(interaction, `The submission has already been accepted.`, accentColor)
    }

    export function submissionHasAlreadyBeenDeclined(interaction, accentColor?: string) {
        return embed(interaction, `The submission has already been declined.`, accentColor)
    }

    export function submissionHasNotBeenReviewed(interaction, accentColor?: string) {
        return embed(interaction, `The submission has not been reviewed yet.`, accentColor)
    }

    export function submissionNotFound(interaction, accentColor?: string) {
        return embed(interaction, `Could not find a submission with that ID.`, accentColor)
    }

    export function submissionRejected(interaction, feedback, url, accentColor?: string) {
        return embed(interaction,
            `Submission has been declined.
            \`${feedback}\`
            __[Submission link](<${url}>)__`,
            accentColor
        )
    }

    export function submissionPurged(interaction, link, accentColor?: string) {
        return embed(interaction, `Submission has been purged. ${link}`, accentColor)
    }

    export function submissionPermissionDenied(interaction, accentColor?: string) {
        return embed(interaction, `You cannot review a submission you submitted.`, accentColor)
    }

    export function submissionNotBeenClaimed(interaction, accentColor?: string) {
        return embed(interaction, 'The submission was not yet claimed', accentColor)
    }

    export function submissionAlreadyClaimed(interaction, accentColor?: string) {
        return embed(interaction, 'The submission was already claimed', accentColor)
    }

    export function submissionClaimedByAnotherReviewer(interaction, reviewer: User, accentColor?: string) {
        return embed(interaction, `The submission is claimed by the reviewer @${reviewer.username}`, accentColor)
    }

    export function purgePermissionDenied(interaction, accentColor?: string) {
        return embed(interaction, `That submission belongs to another server, and you do not have permission to purge it.`, accentColor)
    }

    // PLOT AREA

    export function plotNotFound(interaction, plotId, accentColor?: string) {
        return embed(interaction, `Could not find plot with ID: ${plotId}`, accentColor)
    }

    export function plotClaimedByAnotherBuilder(interaction, accentColor?: string) {
        return embed(interaction, 'The plot is already claimed by another builder', accentColor)
    }

    // ERROR AREA

    export function errorDirectMessaging(interaction, error, accentColor?: string) {
        return embed(interaction, `Something went wrong while sending the dm: ${error}`, accentColor)
    }

    export function errorGeneric(interaction, error, accentColor: string = null, subtitle: string = '') {
        return embed(interaction, `${(subtitle != '') ? subtitle : 'Something went wrong'}: ${error}`, accentColor)
    }

    //

    export function noCompletedBuilds(interaction, username, accentColor?: string) {
        return embed(interaction, `\`${username}\` has no completed builds!`, accentColor)
    }

    export function points(interaction, userID, points, buildings, landMeters, roadKMs, emoji, guildName, accentColor?: string) {
        return embed(interaction,
            `<@${userID}> has :tada: ***${formatNumber(points)}***  :tada: points in ${emoji} ${guildName} ${emoji}!!
            
            Number of buildings: :house: ***${buildings}***  :house:
            Sqm of land: :corn: ***${formatNumber(landMeters)}***  :corn:
            Kilometers of roads: :motorway: ***${formatNumber(roadKMs)}***  :motorway:`,
            accentColor ? accentColor : null,
            `Points`
        )
    }

    export function serverCompletedBuilds(interaction, numberBuilds, accentColor?: string) {
        return embed(interaction,
            `This server has ${numberBuilds} completed buildings.`,
            accentColor ? accentColor : null,
            `Server Progress`
        )
    }

    export function feedbackSent(interaction, feedback, url, accentColor?: string) {
        return embed(interaction,
            `Feedback sent.
            \`${feedback}\`
            __[Submission link](<${url}>)__`,
            accentColor
        )
    }

    export function dmPreferenceUpdated(interaction, value, accentColor?: string) {
        return embed(interaction, `DM preference set to ${value ? 'enabled' : 'disabled'}`, accentColor)
    }

    export function minecraftUsernameUpdatedEmbed(interaction, username, guildData, accentColor?: string) {
        let emd = createEmbed(`The Minecraft username has been set globally to ${username}`, accentColor, `${guildData.emoji} | Minecraft username set!`)
        emd.setFooter({text: `Use the cmd '/preferences' to change your Minecraft username again.`})
        return emd
    }

    export function minecraftUsernameUpdated(interaction, username, guildData, accentColor?: string) {
        return interaction.editReply({embeds: [ minecraftUsernameUpdatedEmbed(interaction, username, guildData, accentColor).toJSON() ]})
    }

    export function userAlreadyBuilder(interaction, accentColor?: string) {
        return embed(interaction, '**You are already a builder**', accentColor)
    }

    // UTIL AREA

    /**
     * Edit the interaction reply with a embed
     * @param interaction The interaction reply to edit
     * @param message The description of the embed
     * @param accentColor The optional accent color of the embed (ex, an hex color, but without the #)
     * @param title The optional title of the embed
     * @returns The updated message with the embed
     */
    export function embed(interaction, message, accentColor: string = null, title = '') {
        return interaction.editReply({embeds: [createEmbed(message, accentColor, title).toJSON()]})
    }

    /**
     * Create the embed with the provided info
     * @param message The description of the embed
     * @param accentColor The optional accent color of the embed (ex, an hex color, but without the #)
     * @param title The optional title of the embed 
     * @returns The EmbedBuilder of the embed
     */
    export function createEmbed(message : string, accentColor: string = null, title = '') : EmbedBuilder {
        if (title != '') return createEmbedWithTitle(title, message, accentColor)
        
        const embed = new EmbedBuilder({ description: message })
        if(accentColor != null)
            embed.setColor(`#${accentColor}`)

        return embed
    }

    function createEmbedWithTitle(title, message, accentColor: string) : EmbedBuilder {
        const embed = new EmbedBuilder({title: title, description: message})

        if(accentColor != null)
            embed.setColor(`#${accentColor}`)

        return embed
    }

    function formatNumber(num) {
        return num.toFixed(2).replace(/[.,]00$/, '')
    }

    /**
     * Edit the interaction reply with a container
     * @param interaction The interaction reply to edit
     * @param message The description text display of the container
     * @param accentColor The optional accent color of the container (ex, an parsed to int hex color)
     * @param title The optional title text display of the container
     * @returns The updated message with the container
     */
    export function container(interaction, message: string, accentColor: number = null, title : string = '') {
        return interaction.editReply({components: [createContainer(message, accentColor, title).toJSON()]})
    }

   /**
     * Create the container with the provided info
     * @param message he description text display of the container
     * @param accentColor The optional accent color of the container (ex, an parsed to int hex color)
     * @param title The optional title text display of the container
     * @returns The ContainerBuilder of the container
     */
    export function createContainer(message: string, accentColor: number = null, title: string = '') : ContainerBuilder {
        const cont = new ContainerBuilder()

        if(title != '')
            cont.addTextDisplayComponents(new TextDisplayBuilder({content: `**${title}**`}))

        cont.addTextDisplayComponents(new TextDisplayBuilder({content: message}))

        if(accentColor != null)
            cont.setAccentColor(accentColor)

        return cont
    }
}

export default Responses