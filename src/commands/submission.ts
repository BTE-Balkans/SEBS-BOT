import { Message, TextChannel, User } from "discord.js";
import { globalArgs } from "../review/options.js";
import Command from "../struct/Command.js";
import { Plot, PlotInterface } from "../struct/Plot.js";
import Submission, { CollaboratorInterface, ParticipantType, SubmissionInterface } from "../struct/Submission.js";
import { checkIfRejected } from "../utils/checkForSubmission.js";
import Responses from "../utils/responses.js";
import { parseContributors, parseEditBuild } from "../utils/parseBuildMessage.js";
import { createSubmissionContainer } from "../utils/createMessageContainers.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { updateSubmissionMsg } from "../review/handleSubmissionMsg.js";
import { updateCollaborators } from "../utils/updateCollaborators.js";

export default new Command({
    name: 'submission',
    description: 'Manage submission',
    subCommands: [
        {
            name: 'edit',
            description: 'Edit a submissions address, coordinates or build count',
            args: [
                globalArgs[0],
                {
                    name: 'address',
                    description: 'New address of the submission',
                    required: false,
                    optionType: 'string'
                }, 
                {
                    name: 'coords',
                    description: 'New geographic coordinates of the plot',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'buildcount',
                    description: 'Number of builds',
                    optionType: 'number',
                    required: false
                }
            ]
        },
        {
            name: 'collaborators',
            description: 'Add or remove collaborators from a submission',
            args: [
                globalArgs[0],
                {
                    name: 'add',
                    description: 'Collaborators to add',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'remove',
                    description: 'Collaborators to add',
                    required: false,
                    optionType: 'string'
                }
            ]
        }
    ],
    async run(i, client) {
        const guildData = client.guildsData.get(i.guildId)
        const options = i.options

        const submissionId = options.getString('submissionid')
        const submitChannel = await i.guild.channels.fetch(guildData.submitChannel) as TextChannel

        let submissionMsg : Message
        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        }catch(err) {
            return Responses.invalidSubmissionID(i, submissionId, guildData.accentColor)
        }

        let submission : SubmissionInterface = await Submission.findOne({id: submissionId, guildId: guildData.id}).lean()

        if(!submission) 
            return Responses.submissionNotFound(i, guildData.accentColor)

        const isRejected = await checkIfRejected(submissionId, guildData.id)
            

        //Prevent the submission being edited after they are claimed by a reviewer if the interaction user is different from reviewer
        //This allows the the reviewer to still edit the submission before it get's reviewed
        if(submission.reviewer && submission.reviewer != i.user.id && !isRejected)
            return Responses.submissionAlreadyClaimed(i, guildData.accentColor)
        else if(submission.reviewer == i.user.id && submission.feedback && !isRejected)
            return Responses.submissionHasAlreadyBeenAccepted(i, guildData.accentColor)
        else if(isRejected)
            return Responses.submissionRejected(i, 'Rejected submission cannot be edited/managed', submissionMsg.url, guildData.accentColor)

        let message : String

        let submissionSubCommand = options.getSubcommand()
        if(submissionSubCommand == 'edit') {
            const plotAddress = options.getString('address')
            const plotCoords = options.getString('coords')
            const buildCount = options.getNumber('buildcount')

            //Get original plot of submission
            let plot : PlotInterface = await Plot.findOne({id: submission.plotId, guildId: guildData.id}).lean()

            if(!plot)
                return Responses.plotNotFound(i, submission.plotId, guildData.accentColor)

            const {
                error,
                count,
                hasCount,
                coords,
                hasCoords,
                address,
                hasAddress
            } = await parseEditBuild(guildData, buildCount, submission.buildCount, plotCoords, plot.coords, plotAddress, plot.address)

            if(!error) {
                let editPlot = {}
                message = `**Submission #${submission.index} updated with:**`

                if(hasAddress == undefined && hasCoords == undefined && hasCount == undefined) {
                    return Responses.embed(i, '**No changes detected**')
                }

                //Update the plot coords or address
                if(hasCoords == '' || hasAddress == '')  {

                    if(hasCoords == '') {
                        plot.coords = coords
                        editPlot['coords'] = coords
                        message += `\n> - Coordinates: \`${coords}\``
                    }

                    if(hasAddress == '') {
                        plot.address = address
                        editPlot['address'] = address
                        message += `\n> - Address: \`${address}\``
                    }

                    await Plot.updateOne({id: plot.id, guildId: guildData.id}, { '$set': editPlot })
                }

                //Update the submission itself if the build count has changed
                if(hasCount == '') {
                    submission.buildCount = count
                    await Submission.updateOne({id: submissionId, guildId: guildData.id}, { $set: { 'buildCount': count}})
                    message += `\n> - Build count: \`${count}\``
                }


            } else {
                let message = '**The provided one or more edits have an incorrect format:**'

                if(hasCount && hasCount != '')
                    message += '\n- The build count must be greater than 0'

                if(hasCoords && hasCoords != '')
                    message += `\n- ${hasCoords}`

                if(hasAddress && hasAddress != '')
                    message += `\n- ${hasAddress}`

                return Responses.embed(i, message, guildData.accentColor)
            }
        }else {
            let edit = {}

            //Add or remove collaborators
            let rawAdd = options.getString('add')
            let rawRemove = options.getString('remove')

            if(!rawAdd && !rawRemove)
                return Responses.embed(i, '**Missing add or remove collaborators**')

            let numberRegex = /^[0-9]+/

            //Update the existing submission collaborators if any changes happened
            if(submission.collaborators && submission.collaborators.length > 0)
                submission.collaborators = await updateCollaborators(submission.collaborators, guildData)

            if(!submission.collaboratorsCount)
                submission.collaboratorsCount = 1

            message = '**The following changes have been made to the collaborators:**'

            if(rawRemove) {
                if(rawRemove.replace(' ', '').length == 0)
                    return Responses.embed(i, '**No collaborators to remove**')

                let res = await parseContributors(rawRemove.split(' '), numberRegex, i.guild, submission.userId)

                if(res.error) {
                    return Responses.embed(i, `**There was an error while parsing the remove contributors option:** \n${res.error}`, guildData.accentColor)
                }
                
                if(res.contributorsCount && submission.collaboratorsCount && submission.collaboratorsCount - res.contributorsCount < 1)
                    return Responses.embed(i, `**Final contributors count must be equal or greater then one, got: ${submission.collaboratorsCount - res.contributorsCount}**`)

                if(res.contributors.length != 0 && submission.collaborators?.length == 0)
                    return Responses.embed(i, '**Cannot remove contributors if the submission contributors is not set**')

                

                for(let contributor of res.contributors) {
                    //Check if contributor to remove exists in the submission collaborators
                    if(submission.collaborators.some((item) => item.type == contributor.type && item.value == contributor.value)) {
                        //Remove the contributor
                        submission.collaborators.splice(submission.collaborators.indexOf(contributor), 1)

                        let contributorName : string
                        if(contributor.type == ParticipantType.Member) {
                            let member = await i.guild.members.fetch(contributor.value)
                            contributorName = `${member}`
                        } else
                            contributorName = `${contributor.value}`

                        message += `\n> - Removed: ${contributorName}`

                        edit['collaborators'] = submission.collaborators
                    }                    
                }

                if(res.contributorsCount != 0) {
                    submission.collaboratorsCount -= res.contributorsCount
                    edit['collaboratorsCount'] = submission.collaboratorsCount
                    message += `\n> - Collaborators count decreased by ${res.contributorsCount}`
                }
            }

            if(rawAdd) {
                if(rawAdd.replace(' ', '').length == 0)
                    return Responses.embed(i, '**No collaborators to add**')

                let res = await parseContributors(rawAdd.split(' '), numberRegex, i.guild, submission.userId)

                if(res.error) {
                    return Responses.embed(i, `**There was an error while parsing the add contributors option:** \n${res.error}`, guildData.accentColor)
                }

                if(res.contributors.length != 0 && (!submission.collaborators || submission.collaborators?.length == 0))
                    submission.collaborators = []

                for(let contributor of res.contributors) {
                    //Check if contributor to add doesn't already exists in the submission collaborators
                    if(!submission.collaborators.some((item) => item.type == contributor.type && item.value == contributor.value)) {
                        //Add the contributor
                        submission.collaborators.push(contributor)

                        let contributorName : string
                        if(contributor.type == ParticipantType.Member) {
                            let member = await i.guild.members.fetch(contributor.value)
                            contributorName = `${member}`
                        } else
                            contributorName = `${contributor.value}`

                        message += `\n> - Added: ${contributorName}`

                        edit['collaborators'] = submission.collaborators
                    }                    
                }

                if(res.contributorsCount != 0) {
                    submission.collaboratorsCount += res.contributorsCount
                    edit['collaboratorsCount'] = submission.collaboratorsCount
                    message += `\n> - Collaborators count increased by ${res.contributorsCount}`
                }
            }

            //Now update the submission 
            await Submission.updateOne({id: submission.id, guildId: guildData.id}, {'$set': edit})

        }

        let reviewer : User
        if(submission.reviewer)
            reviewer = await client.users.fetch(submission.reviewer)

        //Now update the submission message
        updateSubmissionMsg(client, submissionMsg, submission, guildData, i.guild, reviewer)

        return Responses.embed(i, message, guildData.accentColor)
    }
})