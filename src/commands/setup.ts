import { ActionRowBuilder, APIEmbed, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, GuildBasedChannel, Message, resolveColor, User } from 'discord.js'
import Command from '../struct/Command.js'
import Guild, { GuildInterface } from '../struct/Guild.js'
import Bot from '../struct/Client.js'
import Helper, { HelperInterface } from '../struct/Helper.js'
import Difficulty from '../struct/Difficulty.js'
import Responses from '../utils/responses.js'
import { APIEmbedField } from 'discord-api-types/v9'
import { parseMessageUrl } from '../utils/parseMessageUrl.js'

export default new Command({
    name: 'setup',
    description: 'Setup the bot',
    admin: true,
    subCommands: [
        {
            name: 'settings',
            description: 'Configure server settings',
            args: [
                {
                    name: 'name',
                    description: 'Name of server',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'emoji',
                    description: 'Emoji of server',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'submitchannel',
                    description: 'Build submit channel ID',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'builderchannel',
                    description: 'Builder threads channel ID',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'plotschannel',
                    description: 'Plots channel ID - for submitting plots for builders',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'formattingmsg',
                    description: 'Link to formatting message',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'accentcolor',
                    description: 'The accent color of the embeds, containers, etc (Start with #, ex #000000)',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'addroleasreviewer',
                    description: 'Mark role ID as reviewer',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'removeroleasreviewer',
                    description: 'Unmark role ID as reviewer',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'addroleashelper',
                    description: 'Mark role ID as helper',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'removeroleashelper',
                    description: 'Unmark role ID as reviewer',
                    required: false,
                    optionType: 'string'
                }
            ]
        },
        {
            name: 'applicationformatmsg',
            description: 'Configure the builder application format messages (embed) for the junior builder',
            args: [
                {
                    name: 'visitservermsg',
                    description: 'Set the text to be displayed, on how to visit the build server',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'welcomeimg',
                    description: 'Link to the the image to be displayed in the embed',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'guidelink',
                    description: 'Link to the build guide for the junior builder',
                    required: false,
                    optionType: 'string'
                }
            ]
        },
        {
            name: 'rank',
            description: 'Configure rank settings',
            args: [
                {
                    name: 'level',
                    description: 'Level of role',
                    choices: [
                        [Difficulty.Novice, 1],
                        [Difficulty.Beginner, 2],
                        [Difficulty.Competent, 3],
                        [Difficulty.Proficient, 4],
                        [Difficulty.Expert, 5]
                    ],
                    required: true,
                    optionType: 'integer'
                },
                {
                    name: 'roleid',
                    description: 'ID of role',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'points',
                    description: 'Min points needed for level',
                    required: false,
                    optionType: 'integer'
                },
                {
                    name: 'name',
                    description: 'Rank name',
                    required: false,
                    optionType: 'string'
                }
            ]
        },
        {
            name: 'info',
            description: 'View current server setup info'
        },
        {
            name: 'openapplicationmessage',
            description: 'Setup the open application message the channel',
        },
        {
            name: 'formattingmsg',
            description: ' Make or update the existing formatting message in the channel',
            args: [
                {
                    name: 'optionaltext',
                    description: 'Optional text to be inserted after the default instructions text',
                    optionType: 'string',
                    required: false
                }
            ]
        },
        {
            name: 'setuphelper',
            description: 'Add and setup user as helper',
            args: [
                {
                    name: 'user',
                    description: 'User to setup as helper',
                    optionType: 'user',
                    required: true
                }
            ]
        },
        {
            name: 'helperstatus',
            description: 'Mark helper as inactive or active',
            args: [
                {
                    name: 'user',
                    description: 'Helper user',
                    optionType: 'user',
                    required: true
                },
                {
                    name: 'inactive',
                    description: 'True if inactive, false if active',
                    required: true,
                    optionType: 'boolean',
                }
            ]
        }
    ], 

    async run(i, client) {
        const options = i.options
        let guildId = i.guild.id
        let subCommand = i.options.getSubcommand()

        let guild = {}
        let hasInputData = false

        let guildData = client.guildsData.get(i.guildId)

        if(subCommand == 'settings') {
            const name = options.getString('name')
            const emoji = options.getString('emoji')
            const submitchannel = options.getString('submitchannel')
            const builderchannelid = options.getString('builderchannel')
            const plotschannel = options.getString('plotschannel')
            const formattingmsg = options.getString('formattingmsg')
            const accentColor : string = options.getString('accentcolor')
            const addroleasreviewer = options.getString('addroleasreviewer')
            const removeroleasreviewer = options.getString('removeroleasreviewer')
            const addroleashelper = options.getString('addroleashelper')
            const removeroleashelper = options.getString('removeroleashelper')

            if(builderchannelid) {
                const builderChannel = await i.guild.channels.fetch(builderchannelid)
                if(!builderChannel)
                    return Responses.embed(i, `**Invalid Builder Channel:** \nCould not find channel for ID ${builderchannelid}`)
            }

            if(plotschannel) {
                const plotsChannel = await i.guild.channels.fetch(plotschannel)
                if(!plotsChannel)
                    return Responses.embed(i, `**Invalid Plots Channel:** \nCould not find channel for ID ${plotsChannel}`)
            }

            if(name || emoji || submitchannel || builderchannelid || plotschannel || formattingmsg) {
                if(name) {
                    guild['name'] = name
                }
                if(emoji) {
                    guild['emoji'] = emoji
                }
                if(submitchannel) {
                    guild['submitChannel'] = submitchannel
                }
                if(builderchannelid) {
                    guild['builderChannel'] = builderchannelid
                }
                if(plotschannel) {
                    guild['plotsChannel'] = plotschannel
                }
                if(formattingmsg) {
                    guild['formattingMsg'] = formattingmsg
                }
                hasInputData = true
            }

            if(accentColor && accentColor.startsWith('#')) {
                let color = accentColor.slice(1)
                try {
                    resolveColor(`#${color}`)
                    hasInputData = true
                    guild['accentColor'] = color
                }catch(err) {
                    return Responses.embed(i, `**Invalid input color code:** #${color}`)
                }
            }

            if(addroleasreviewer || removeroleasreviewer) {
                try {
                    let roles : string[] = client.guildsData.get(guildId).reviewerRoles
                    hasInputData = addRemoveRole(addroleasreviewer, removeroleasreviewer, roles, 'reviewer', 'reviewerRoles', hasInputData, i, guild)
                }catch(err) {
                    return Responses.embed(i, `**Error while adding/removing reviewer role:** ${err.message}`)
                }
            }

            if(addroleashelper || removeroleashelper) {
                try {
                    let roles: string[] = client.guildsData.get(guildId).helperRoles
                    hasInputData = addRemoveRole(addroleashelper, removeroleashelper, roles, 'helper', 'helperRoles', hasInputData, i, guild)
                }catch(err) {
                    return Responses.embed(i, `**Error while adding/removing helper role:** ${err.message}`)
                }
            }

        } else if(subCommand == 'applicationformatmsg') {
            let applicationFormatMsg = {}
            let res = await Guild.findOne({id: guildId})
            if(res.applicationFormatMsg)
                applicationFormatMsg = res.applicationFormatMsg

            const visitServerMsg : string = options.getString('visitservermsg')
            const welcomeImg = options.getString('welcomeimg')
            const guideLink = options.getString('guidelink')

            if(visitServerMsg || welcomeImg || guideLink) {
                hasInputData = true
                if(visitServerMsg) {
                    applicationFormatMsg['visitServerMsg'] = visitServerMsg
                } else if(welcomeImg) {
                    applicationFormatMsg['welcomeImg'] = welcomeImg
                } else {
                    applicationFormatMsg['guideLink'] = guideLink
                }
            }

            if(hasInputData) {
                guild['applicationFormatMsg'] = applicationFormatMsg
            }

        } else if (subCommand == 'rank') {
            const level : number = options.getInteger('level')
            const rankId : string = options.getString('roleid')
            const rankPoints : number = options.getInteger('points')
            const rankName : string = options.getString('name')

            if(rankId || rankPoints || rankName) {
                let rank = {}
                let res = await Guild.findOne({id: guildId})
                if(res) {
                    rank = res['rank' + level]
                }
                
                if(rankId) {
                    rank['id'] = rankId
                }
                if(rankPoints) { 
                    rank['points'] = rankPoints
                }
                if(rankName) {
                    rank['name'] = rankName
                }

                guild['rank' + level] = rank

                hasInputData = true

            }
        } else if(subCommand == 'info') {
            let embed = await getSettingsEmbed(i, client, i.guild.id, 'Current server setup info') 
            return i.editReply({embeds: [embed]})  
        } else if(subCommand == 'openapplicationmessage') {
            if(!guildData.accentColor)
                return Responses.embed(i, '**You must first set the accent color via `/setup settings accentcolor`**')


            const applyButton = new ButtonBuilder()
                .setCustomId('openapplicationbutton')
                .setLabel('Apply')
                .setEmoji('🎟️') //'🎫'
                .setStyle(ButtonStyle.Danger)
            const row = new ActionRowBuilder().addComponents(applyButton)
            
            
            const embed = {
                title: 'Apply to become a builder 👷',
                description: `Click the button below to apply to *${guildData.name}*`,
                color: resolveColor(`#${guildData.accentColor}`)
            }

            let msg = await i.channel.send({embeds: [embed], components: [row.toJSON()]})
            return Responses.embed(i, `**Open application message posted:** ${msg.url}`, guildData.accentColor)
        } else if(subCommand == 'formattingmsg') {
            try{
                if(!i.channel.isSendable())
                    return Responses.embed(i, '**Cannot send messages to this channel**')

                if(!guildData.accentColor)
                    return Responses.embed(i, '**You must first set the accent color via `/setup settings accentcolor`**')

                //Check if the submissions channel is not set 
                if(!guildData.submitChannel)
                    return Responses.embed(i, '**Submission channel must first be set via `/setup settings submitchannel`**', guildData.accentColor)

                //Check if submissions channel still exists
                let submitChannel = await i.guild.channels.fetch(guildData.submitChannel)
                if(!submitChannel)
                    return Responses.embed(i, `**Could not find submission channel with ID:** ${guildData.submitChannel}`, guildData.accentColor)

                let optionalText = options.getString('optionaltext')

                let embed = createSubmissionFormatMessageEmbed(submitChannel, guildData, optionalText)

                let msg: Message 

                if(guildData.formattingMsg) {
                    //Update the existing message if it still exists
                    let channelMessageID = parseMessageUrl(guildData.formattingMsg)
                    //Fetch channel where the message is posted
                    let formattingMsgChannel = await i.guild.channels.fetch(channelMessageID.channelID) 
                    if(formattingMsgChannel && formattingMsgChannel.isTextBased()) {

                        try {
                            let orgMsg = await formattingMsgChannel.messages.fetch(channelMessageID.messageID)
                            //If the message exist but the id of the channel where It's posted is different from where this command was executed
                            //delete the message. This way only one formatting message should exits per guild
                            if(formattingMsgChannel.id != i.channelId) {
                                await orgMsg.delete()
                            }else {
                                msg = orgMsg
                            }
                        }catch(err){}

                        //Update the message
                        if(msg)
                            await msg.edit({embeds: [embed]})
                    }
                }

                //Else if doesn't create it
                if(!msg) {
                    msg = await i.channel.send({embeds: [embed]})
                }

                //Insert the message url into the guild data
                await Guild.updateOne({id: guildData.id}, {$set: { 'formattingMsg': msg.url}})
                

                guildData.formattingMsg = msg.url
                //Update the client guilds data with the new formatting message url
                client.guildsData.set(guildData.id, guildData)

                return Responses.embed(i, `**Submission format message posted:** ${msg.url}`)
            } catch(err) {
                return Responses.embed(i, `**[FormattingMsgException]:** \n${err}}`)
            }
        } else if(subCommand == 'setuphelper' || subCommand == 'helperstatus') {
            const user : User = options.getUser('user')
            const guildUser = await i.guild.members.fetch(user) 
            //Check if guild user has a helper role
            let isHelperRole = guildUser.roles.cache.some((role) => guildData.helperRoles.includes(role.id))
            if(isHelperRole) {
                let isInactive : boolean = true

                let helper : HelperInterface = await Helper.findOne({id: guildUser.id, guildId: guildId}).lean()
                if(helper) {
                    if(subCommand == 'setuphelper') {
                        if(helper.inactive) {
                            return Responses.embed(i, `**Helper ${guildUser} status is inactive**`)
                        }
                        return Responses.embed(i, `**Helper ${guildUser} is already setup**`)
                    }else {
                        //Else mark user as inactive or active
                        isInactive = i.options.getBoolean('inactive')

                        if(helper.inactive == isInactive) {
                            return Responses.embed(i, `**Helper ${guildUser} status is already ${(isInactive) ? 'inactive' : 'active'}**`)
                        }
                    }
                }else if(subCommand == 'helperstatus') {
                    return Responses.embed(i, `**Setup ${guildUser} as helper first**`)
                }

                Helper.updateOne({id: guildUser.id, guildId: guildId}, (subCommand == 'setuphelper') ? {'$set': { 'inactive': false}} : { '$set': { 'inactive': isInactive}}, {upsert: true}).then((res) => {
                    return Responses.embed(i, `**Helper ${guildUser} ${(subCommand == 'helperstatus') ? 'status updated' : 'setup'}**`)
                }).catch((err) => {
                    console.log(err)
                    return Responses.embed(i, `**Error while updating ${guildUser}**\n > ${err}`)
                })

            } else {
                return Responses.embed(i, `**User ${guildUser} doesn't have a helper role**`)
            }
        }

        if(hasInputData) {
            Guild.updateOne({id: guildId}, { '$set' : guild}, { upsert: true}).then(async (res) => {
                let embed = await getSettingsEmbed(i, client, guildId, 'Server settings successfully set!')
                return i.editReply({embeds: [embed]})
            }).catch((err) => {
                if(err) {
                    console.log(err)
                    return Responses.embed(i, `**Error while updating setting** \n> ${err}`)
                }
            })
        }else {
            return Responses.embed(i, '**No setting options provided**')
        }
    }
})

function addRemoveRole(addrole: string, removerole: string, roles: string[], roleType: string, roleProperty: string, hasInputData: boolean, i: ChatInputCommandInteraction, guild: {}) : boolean{
    if(addrole == removerole) {
        throw new Error(`Add and remove ${roleType} role is the same`)
    }

    if(addrole) {
        //Check if role is already marked
        if(roles.includes(addrole)) {
            throw new Error(`Role ${addrole} is already marked as ${roleType}`)
        } else {
            roles.push(addrole)
            guild[`${roleProperty}`] = roles
            hasInputData = true
        }
    }

    if(removerole) {
        if(roles.includes(removerole)) {
            roles.forEach((role, index) => {
                if(role == removerole)
                    roles.splice(index, 1)
            })

            guild[`${roleProperty}`] = roles
            hasInputData = true
        }
    }

    return hasInputData;
}

async function getSettingsEmbed(i : ChatInputCommandInteraction, client: Bot, guildId: string, msg: string) : Promise<APIEmbed> {
    const guildData = await Guild.findOne({id: guildId})
    client.guildsData.set(guildId, guildData)

    let embed : APIEmbed = {
        title: 'Server settings',
        description: msg
    }

    let fields : APIEmbedField[] = []

    if(guildData.name) {
        fields.push({ name: 'Server name', value: (guildData.emoji) ? `${guildData.emoji} | ${guildData.name}` : `${guildData.name}` })
    }

    if(guildData.submitChannel) {
        const submitChannel = await i.guild.channels.fetch(guildData.submitChannel)
        fields.push({ name: 'Submission channel', value: (submitChannel) ? `${submitChannel} (${guildData.submitChannel})` : `Invalid ID - ${guildData.submitChannel}` })
    }

    if(guildData.buildersChannel) {
        const builderChannel = await i.guild.channels.fetch(guildData.buildersChannel)
        fields.push({ name: 'Builder channel', value: (builderChannel) ? `${builderChannel} (${guildData.buildersChannel})` : `Invalid ID - ${guildData.buildersChannel}`})
    }

    if(guildData.plotsChannel) {
        const plotsChannel = await i.guild.channels.fetch(guildData.plotsChannel)
        fields.push({ name: 'Plots channel', value: (plotsChannel) ? `${plotsChannel} (${guildData.plotsChannel})` : `Invalid ID - ${guildData.plotsChannel}`})
    }

    if(guildData.formattingMsg) {
        fields.push({ name: 'Formatting message', value: guildData.formattingMsg })
    }

    if(guildData.accentColor) {
        fields.push({ name: 'Accent color', value: `#${guildData.accentColor}`})
    }

    if(guildData.reviewerRoles && guildData.reviewerRoles.length > 0) { 
        let roles = ''
        for(let r = 0; r < guildData.reviewerRoles.length; r++) {
            const roleID = guildData.reviewerRoles.at(r)
            const role = await i.guild.roles?.fetch(roleID)
            if(role)
                roles += (r > 0) ? `\n${role} (${roleID})` : `${role} (${roleID})` 
        }
        fields.push({name: `Reviewer roles`, value: roles})
    }

    if(guildData.helperRoles && guildData.helperRoles.length > 0) {
        let helpers = ''
        for(let h = 0; h < guildData.helperRoles.length; h++) {
            const roleID = guildData.helperRoles.at(h)
            const role = await i.guild.roles?.fetch(roleID)
            if(role)
                helpers += (h > 0) ? `\n${role} (${roleID})` : `${role} (${roleID})`
        }
        fields.push({name: 'Helper roles', value: helpers})
    }

    if(guildData.applicationFormatMsg) {
        let welcomeMsg : string[] = []
        if(guildData.applicationFormatMsg.visitServerMsg)
            welcomeMsg.push(`**VisitMsg:** ${guildData.applicationFormatMsg.visitServerMsg}`)
        if(guildData.applicationFormatMsg.welcomeImg)
            welcomeMsg.push(`**[WelcomeImg](${guildData.applicationFormatMsg.welcomeImg})**`)
        if(guildData.applicationFormatMsg.guideLink)
            welcomeMsg.push[`[**GuideLink**](${guildData.applicationFormatMsg.guideLink})`]

        if(welcomeMsg.length > 0)
            fields.push({name: 'Application Format Msg', value: welcomeMsg.join('\n ')})
    }

    for(let i = 1; i <= 5; i++) {
        if(guildData['rank' + i]) {
            const rank = guildData['rank' + i]
            let rankDesc = []

            if(rank.name) {
                rankDesc.push('**Role**: ' + rank.name + ' ')
            }

            if(rank.id) {
                rankDesc.push('**RoleID**: ' + rank.id + ' ')
            }

            if(rank.points) {
                rankDesc.push('**Points**: ' + rank.points)
            }

            if(rankDesc.length != 0) {
                fields.push({name: 'Rank ' + i, value: rankDesc.join(','), inline: true})
            }
        }
    }

    embed.fields = fields

    return embed
}

function createSubmissionFormatMessageEmbed(submitChannel: GuildBasedChannel, guildData: GuildInterface, optionalText?: string) {
    let paragraph1 = `To submit a build in ${submitChannel}, the submission must be in a single message in the following format:`

    let messageFormat = `\`\`\`[Build count]\n[Geographic coordinates]\n[Build name (opt.), International address]\n[Collaborators (Optional)]\n[Image(s) of build]\`\`\``

    let paragraph2 : string[] = ['- The build count is informative only and may not always be used directly',
    '- Geographic coordinates are optimally within the plot bounds, but in front of the build, ex. as if it were used to set a warp',
    '- The third line may optionally contain the build name, followed by the mandatory international address',
    '- The optional fourth line must be set if multiple builders built a build, hence only the main builder may submit this build. It may contain one or more Discord users tagged, Minecraft usernames or simply the number of collaborators, all separated by a whitespace',
    '- The submission must include one or more attached screenshots of the build']

    let paragraph3 = `**Example submission message:**
    > 1
    > 41.32960553669458, 19.818597583374636
    > Build name, Street name 1, City PostalCode, Country
    > \@discordusername minecraftusername1 minecraftusername2 1`

    let paragraph4 : string[] = ['After the submission message gets sent, it gets re-posted, hence any typos or collaborator changes can be edited later, but not before they are claimed for review with the \`/submission\` command:',
    '- \`/submission edit [submissionIndex] <address> <coords> <buildcount>\` - Edit one or more properties',
    '- \`/submission collaborators [submissionIndex] <add> <remove>\` - Add or remove collaborators ']

    let paragraph5 = [
        'Ex. to change the build count to 2, remove the collaborator *minecraftusername1* and remove 1 more collaborator on a submission with an index of #1, you would use two commands:',
        '\`\`\`',
        '/submission edit 1 buildcount: 2',
        '/submission collaborators 1 remove: minecraftusername1 1',
        '\`\`\`'
    ]

    let paragraph6 = `> ℹ️ **Note:** If a submission was already claimed for review but not yet reviewed, and you want to change the submission, contact the submission reviewer.`

    let description = `${paragraph1}\n\n${messageFormat}\n\n${paragraph2.join('\n')}\n\n${paragraph3}\n\n${paragraph4.join('\n')}\n\n${paragraph5.join('\n')}\n\n${paragraph6}`

    if(optionalText)
        description += `\n\n${optionalText}`

    let embed : APIEmbed = {
        title: `Submission Format 📄`,
        description: description,
        color: resolveColor(`#${guildData.accentColor}`)
    }

    return embed
/*








*/
}

export { getSettingsEmbed }