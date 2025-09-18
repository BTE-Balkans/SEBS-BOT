import Command from "../struct/Command.js";
import { Plot, PlotInterface } from "../struct/Plot.js";
import Responses from "../utils/responses.js";
import { deletePlot, editPlot } from "../trial/handlePlot.js";
import Difficulty from "../struct/Difficulty.js";
import getHelperMember from "../utils/getHelperMember.js";

export default new Command({
    name: 'plot',
    description: 'Manage plots in the trial system',
    helper: true,
    subCommands: [
        {
            name: 'edit',
            description: 'Edit an plot',
            args: [
                {
                    name: 'plotid',
                    description: 'ID of the message to the plot',
                    required: true,
                    optionType: 'string'
                },
                {
                    name: 'address',
                    description: 'Address of plot',
                    required: false,
                    optionType: 'string'
                }, 
                {
                    name: 'coords',
                    description: 'Geographic coordinates of the plot',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'difficulty',
                    description: 'Difficulty of the plot',
                    choices: [
                        [Difficulty.Novice, 1],
                        [Difficulty.Beginner, 2],
                        [Difficulty.Competent, 3],
                        [Difficulty.Proficient, 4],
                        [Difficulty.Expert, 5]
                    ],
                    required: false,
                    optionType: 'integer'
                },
                {
                    name: 'maplink',
                    description: 'Location map link',
                    required: false,
                    optionType: 'string'
                }
            ]
        },
        {
            name: 'delete',
            description: 'Delete the plot',
            args: [
                {
                    name: 'plotid',
                    description: 'ID of the message to the plot',
                    required: true,
                    optionType: 'string'
                }
            ]
        }
    ],
    async run(i, client) {
        const options = i.options;
        const subCommand = options.getSubcommand()
        const guildData = client.guildsData.get(i.guildId)
        
        //Check if the user is not a helper
        let helper = await getHelperMember(i, guildData)
            if(helper == null)
                return Responses.embed(i, '**You must be a helper to perform this action**', guildData.accentColor)

        const plotID = options.getString('plotid')
        let plot : PlotInterface = await Plot.findOne({id: plotID, guildId: guildData.id}).lean()

        if(plot) {
            if(subCommand == 'edit') {
                if(plot.plotter != i.user.id)
                    return Responses.embed(i, '**Only author of plot can edit plot**', guildData.accentColor)

                if(plot.builder != null) {
                    return Responses.embed(i, '**Cannot edit plot** \nPlot is assigned to a builder', guildData.accentColor)
                }

                const plotAddress = options.getString('address')
                const plotCoords = options.getString('coords')
                const plotDiff = options.getInteger('difficulty')
                const plotMapLink = options.getString('maplink')

                if(plotAddress || plotCoords || plotDiff || plotMapLink) {
                    try {
                        let res = await editPlot(i, guildData, plot, plotAddress, plotCoords, plotDiff, plotMapLink)
                        return Responses.embed(i, res, guildData.accentColor)
                    }catch(err) {
                        console.log(`[PlotEditError] ${err}`)
                        return Responses.errorGeneric(i, err, guildData.accentColor, 'Something went wrong while editing plot')
                    }
                    
                } else {
                    return Responses.embed(i, '**No inputs given**', guildData.accentColor)
                }
                
            } else if(subCommand == 'delete') {
                try{
                    const res = await deletePlot(i, guildData, plot)
                    return Responses.embed(i, res, guildData.accentColor)
                }catch(err) {
                    console.log(`[PlotDeleteError] ${err}`)
                    return Responses.errorGeneric(i, err, guildData.accentColor, 'Something went wrong while deleting plot')
                }   
            }
                
        }else {
            return Responses.embed(i, '**Invalid plot ID, could not find message for ID**', guildData.accentColor)
        }
    }
})