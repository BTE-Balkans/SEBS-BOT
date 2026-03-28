import { TextChannel, ThreadChannel } from "discord.js";
import Command from "../struct/Command.js";
import { Plot, PlotInterface } from "../struct/Plot.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import Responses from "../utils/responses.js";
import { claimPlot, reopenPlotMessage, reviewPlot, revokePlot } from "../trial/handlePlot.js";
import { plotArgs } from "../trial/options.js";
import { globalArgs, oneArgs } from "../review/options.js";
import validateFeedback from "../utils/validateFeedback.js";
import mongoose from "mongoose";

export default new Command({
    name: 'task',
    description: 'Manage junior builder tasks',
    helper : true,
    subCommands: [
        {
            name: 'assign',
            description: 'Assign task to junior builder',
            args: [...plotArgs]
        },
        {
            name: 'revoke',
            description: 'Revoke task from junior builder',
            args: [...plotArgs]
        },
        {
            name: 'review',
            description: 'Review task given to junior builder',
            args: [
                ...plotArgs,
                ...oneArgs,
                ...globalArgs.slice(1, 2),
                {
                    name: 'buildimage',
                    description: 'Screenshot of build',
                    optionType: 'attachment',
                    required: true
                },
                {
                    name: 'buildcount',
                    description: 'Number of builds',
                    optionType: 'number',
                    required: false
                },
                
            ]
        }
    ],
    async run(i, client) {
        const options = i.options;
        const guildData = client.guildsData.get(i.guildId)
        const subCommand = options.getSubcommand()

        //Check if task was used within a thread in the builders channel
        let validChannel = i.channel.isThread && i.channel.parentId == guildData.buildersChannel

        if(!validChannel) {
            //Get applications channel
            const builderChannel = i.guild.channels.cache.get(guildData.buildersChannel) as TextChannel
            return Responses.embed(i, `**Command can only be run inside the builders channel ${builderChannel}**`, guildData.accentColor)
        }

        let plotID = options.getString('plotid')
        let plot : PlotInterface = await Plot.findOne({id: plotID, guildId: guildData.id}).lean()
        if(plot) {
            //Find builder through thread id
            const builder : BuilderInterface = await Builder.findOne({'guildId': guildData.id, 'threadId' : i.channelId }).lean()

            //Get the guild member for the helper
            const helper = await i.guild.members.fetch(builder.helperId)

            if(subCommand == 'assign') {
                if(builder.applicationClosed)
                    return Responses.embed(i, '**The application is closed**', guildData.accentColor)
                try {
                    //Claim the plot
                    let res = await claimPlot(i, client, plot, builder, helper, guildData, i.channel as ThreadChannel, null)
                    return Responses.embed(i, res, guildData.accentColor)
                }catch(err) {
                    console.log('[TaskAssignError] ' + err)
                    return Responses.errorGeneric(i, err, guildData.accentColor, 'Something went wrong while assigning the task')
                }
            }else if(subCommand == 'revoke') {
                try {
                    const res = await revokePlot(i, plot, builder, helper, guildData, i.channel as ThreadChannel)
                    return Responses.embed(i, res, guildData.accentColor)
                }catch(err) {
                    console.log('[TaskRevokeError] ' + err)
                    return Responses.errorGeneric(i, err, guildData.accentColor, 'Something went wrong while revoking the task')
                }
            } else if(subCommand == 'review') {
                try {
                    let feedback = validateFeedback(options.getString('feedback'))
                    const size = options.getInteger('size')
                    const quality = options.getNumber('quality')
                    const complexity = options.getNumber('complexity')
                    const bonus = options.getNumber('bonus') || 1
                    const buildCount = options.getNumber('buildcount') | 1
                    //const buildImage = options.getAttachment('buildimage')

                    //if(!buildImage.contentType.startsWith('image'))
                    //    return Responses.embed(i, 'The build screenshot attachment must be a image', guildData.accentColor)

                    let builderUser = await client.users.fetch(builder.id)
                    let res = await reviewPlot(i, client, plot, builder, builderUser, helper, buildCount, size, quality, complexity, bonus, feedback, plot.refPhoto, '82-1_rožna_dolina_rožnik_ljubljana_1922.jpg', guildData, i.channel as ThreadChannel)
                    return Responses.embed(i, res, guildData.accentColor)
                    
                }catch(err) {
                    console.log('[TaskReviewError] ' + err)
                    return Responses.errorGeneric(i, err, guildData.accentColor, 'Something went wrong while reviewing the task')
                }
            }
        }else {
            return Responses.embed(i, '**Invalid plot ID, could not find message for ID**', guildData.accentColor)
        }
    }
})