import { APIContainerComponent, APIMediaGalleryItem, ContainerBuilder, Guild, GuildMember, User, MediaGalleryBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, ThumbnailBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { GuildInterface } from "../struct/Guild.js";
import { BuilderInterface } from "../struct/Builder.js";
import { CollaboratorInterface, ParticipantType, SubmissionInterface } from "../struct/Submission.js";
import DifficultyEmoji from "./difficultyEmoji.js";
import { getPointsBreakdown } from "./getPointsBreakdown.js";

async function createSubmissionContainer(submissionIndex : number, submissionAuthor : User, submissionBuilder: BuilderInterface, buildCount: number,  coords: string, address: string, collaboratorsCount: number, collaborators : CollaboratorInterface[], submissionImages: string[], accentColor: string, guild: Guild, reviewer? : User, submission?: SubmissionInterface) : Promise<APIContainerComponent> {
    let container = new ContainerBuilder()
        .setAccentColor(parseInt(accentColor, 16))
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    createTextDisplayBuilder( `**${submissionBuilder.mcUsername}**`), 
                    createTextDisplayBuilder( `# [#${submissionIndex}](https://www.btebalkans.com)`) //#ToDo: Replace url with something useful it the future, ex /sub/<id>
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder({media: {url: submissionAuthor.displayAvatarURL({size: 512})}})
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder({divider: true, spacing: SeparatorSpacingSize.Small})
        )
        .addTextDisplayComponents(
            createTextDisplayBuilder( `**Address:** \n${address}`),
        )
        .addTextDisplayComponents(
            createTextDisplayBuilder( `**Coordinates:** \n\`${coords}\``)
        )
        .addTextDisplayComponents(
            createTextDisplayBuilder( `**Build Count:** ${buildCount}`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder({divider: true, spacing: SeparatorSpacingSize.Small})
        )
        .addTextDisplayComponents(
            createTextDisplayBuilder( `**Builder:** ${submissionAuthor}`)
        )

    if(collaboratorsCount > 1) {
        if(collaborators?.length > 0) {
            let collaboratorsInfo : TextDisplayBuilder[] = []
            for(let builder of collaborators) {
                if(builder.type == ParticipantType.Member) {
                    //Ignore the submission author from the collaborators length
                    if(builder.value != submissionAuthor.id) {
                        let builderMember = await guild.members.fetch(builder.value)
                        collaboratorsInfo.push(createTextDisplayBuilder( ` - ${builderMember}`))
                    }
                } else if(builder.type == ParticipantType.Player) //Builder that has not yet been linked with their Discord profile
                    collaboratorsInfo.push(createTextDisplayBuilder( ` - ${builder.value}`))
            }

            container
            .addTextDisplayComponents(
                createTextDisplayBuilder( `**Collaborators (${collaboratorsCount - 1}):**`),
                ...collaboratorsInfo
            )
        } else {
            container
            .addTextDisplayComponents(
                createTextDisplayBuilder( `**Collaborators: **\`${collaboratorsCount - 1}\``)
            )
        }
        
        
    }

    if(reviewer || submission?.pointsTotal)
        container
            .addSeparatorComponents(
                new SeparatorBuilder({divider: true, spacing: SeparatorSpacingSize.Small})
            )

    if(reviewer)
        container
            .addTextDisplayComponents(
                createTextDisplayBuilder( `**Reviewer:** ${reviewer}`)
            )
    if(submission?.pointsTotal) {
        let stats : TextDisplayBuilder[] = []
        if(submission.submissionType != null) {
            let pointsBreakdown = getPointsBreakdown(submission)
            pointsBreakdown.forEach((pointBreakdown) => stats.push(createTextDisplayBuilder(`**${pointBreakdown.name}:** ${pointBreakdown.value}`)))
        }

        container
            .addTextDisplayComponents(
                createTextDisplayBuilder( `**Score: ${submission.pointsTotal} points** (${new Date(submission.reviewTime).toDateString()})`),
                ...stats
            )
    }

    let imageItems : APIMediaGalleryItem[] = []

    for(let imageUrl of submissionImages) {
        imageItems.push(
            {
                media: {
                    url: imageUrl
                }
            }
        )
    }

    container
        .addMediaGalleryComponents(
            new MediaGalleryBuilder({items: imageItems})
        )

    return container.toJSON()
}

/**
 * Creates the container components for the plot message
 * @param plotAddress The address to the plot
 * @param plotCoords The coordinates of the plot
 * @param plotDifficulty The difficulty of the plot, [1, 5]
 * @param refPhoto The reference photo url of the plot
 * @param mapUrl The url to the plot on a online map
 * @param plotAuthor The guild member that is the plot author
 * @param accentColor The accent color of the container
 * @param builderMember The optional guild member of the builder
 * @param builder The optional builder info
 * @param plotComplete The optional date of the date when the plot was completed
 * @returns The ContainerBuilder of the container for the plot
 */
function createPlotContainer(plotAddress: string, plotCoords: string, plotDifficulty: number, refPhoto: string, mapUrl: string, plotAuthor : GuildMember, accentColor: string, builderMember: GuildMember = null, builder: BuilderInterface = null, plotComplete: number = null) : ContainerBuilder {
    let container = new ContainerBuilder()
        .setAccentColor(parseInt(accentColor, 16))
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    createTextDisplayBuilder( `### ${plotAddress}`)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder({media: {url: plotAuthor.displayAvatarURL({size: 512})}})
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder({divider: true, spacing: SeparatorSpacingSize.Small})
        )
        .addTextDisplayComponents(
            createTextDisplayBuilder( `**Teleport Command:** \n\`/tpll ${plotCoords}\` `)
        )
        .addSeparatorComponents(
            new SeparatorBuilder({divider: true, spacing: SeparatorSpacingSize.Small})
        )
        .addTextDisplayComponents(
            createTextDisplayBuilder(`**Difficulty**: ${DifficultyEmoji.get(plotDifficulty)} ${plotDifficulty}/5`)
        )
        .addTextDisplayComponents(createTextDisplayBuilder(`**Map Link**: ${mapUrl}`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder({divider: true, spacing: SeparatorSpacingSize.Small})
        )
        .addTextDisplayComponents(
            createTextDisplayBuilder(`**Plotted by:** ${plotAuthor}`)
        )

    let actionRowButtons : ButtonBuilder[] = []
    const assignButton = new ButtonBuilder().setCustomId('plot_assign').setLabel('Assign').setEmoji('☑️').setStyle(ButtonStyle.Primary)
    const editButton = new ButtonBuilder().setCustomId('plot_edit').setLabel('Edit').setEmoji('📝').setStyle(ButtonStyle.Success)
    const deleteButton = new ButtonBuilder().setCustomId('plot_delete').setLabel('Delete').setEmoji('🗑️').setStyle(ButtonStyle.Danger)

    if(builder && builderMember) {
        if(plotComplete) {
            container.addTextDisplayComponents(
                createTextDisplayBuilder(`**Completed by:** \`${builder.mcUsername}\`(${builderMember}) on **${plotComplete}**`)
            )
        } else {
            container.addTextDisplayComponents(
                createTextDisplayBuilder(`**Builder:** \`${builder.mcUsername}\`(${builderMember})`)
            )
        }
    }else
        actionRowButtons = [assignButton, editButton, deleteButton]
    container.addSeparatorComponents(
        new SeparatorBuilder({divider: true, spacing: SeparatorSpacingSize.Small})
    )
    .addMediaGalleryComponents(
        new MediaGalleryBuilder({items: [{
            media: {
                url: refPhoto
            }
        }]})
    )
    .addSeparatorComponents(
        new SeparatorBuilder({divider: true, spacing: SeparatorSpacingSize.Large})
    )

    if(actionRowButtons.length > 0)
        container.addActionRowComponents((actionRow) =>
            actionRow.addComponents(actionRowButtons)
        )

    return container
}

function createTextDisplayBuilder(content: string) {
    return new TextDisplayBuilder({content: content})
}


export { createSubmissionContainer, createPlotContainer, createTextDisplayBuilder }
