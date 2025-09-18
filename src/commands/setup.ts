import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, resolveColor, User } from 'discord.js'
import Command from '../struct/Command.js'
import Guild from '../struct/Guild.js'
import Bot from '../struct/Client.js'
import Helper, { HelperInterface } from '../struct/Helper.js'
import Difficulty from '../struct/Difficulty.js'
import Responses from '../utils/responses.js'

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
                    name: 'applicantchannel',
                    description: 'Applicant threads channel ID',
                    required: false,
                    optionType: 'string'
                },
                {
                    name: 'plotschannel',
                    description: 'Plots channel ID - for submitting plots for applicants',
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
            name: 'applicantformatmsg',
            description: 'Configure the builder application format messages (embed) for the applicant',
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
                    description: 'Link to the build guide for the applicant',
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
            const applicantchannel = options.getString('applicantchannel')
            const plotschannel = options.getString('plotschannel')
            const formattingmsg = options.getString('formattingmsg')
            const accentColor : string = options.getString('accentcolor')
            const addroleasreviewer = options.getString('addroleasreviewer')
            const removeroleasreviewer = options.getString('removeroleasreviewer')
            const addroleashelper = options.getString('addroleashelper')
            const removeroleashelper = options.getString('removeroleashelper')

            if(applicantchannel) {
                const applicantChannel = await i.guild.channels.fetch(applicantchannel)
                if(!applicantChannel)
                    return Responses.embed(i, `**Invalid Applicant Channel:** \nCould not find channel for ID ${applicantChannel}`)
            }

            if(plotschannel) {
                const plotsChannel = await i.guild.channels.fetch(plotschannel)
                if(!plotsChannel)
                    return Responses.embed(i, `**Invalid Plots Channel:** \nCould not find channel for ID ${plotsChannel}`)
            }

            if(name || emoji || submitchannel || applicantchannel || plotschannel || formattingmsg) {
                if(name) {
                    guild['name'] = name
                }
                if(emoji) {
                    guild['emoji'] = emoji
                }
                if(submitchannel) {
                    guild['submitChannel'] = submitchannel
                }
                if(applicantchannel) {
                    guild['applicantChannel'] = applicantchannel
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

        } else if(subCommand == 'applicantformatmsg') {
            let applicantFormatMsg = {}
            let res = await Guild.findOne({id: guildId})
            if(res.applicantFormatMsg)
                applicantFormatMsg = res.applicantFormatMsg

            const visitServerMsg : string = options.getString('visitservermsg')
            const welcomeImg = options.getString('welcomeimg')
            const guideLink = options.getString('guidelink')

            if(visitServerMsg || welcomeImg || guideLink) {
                hasInputData = true
                if(visitServerMsg) {
                    applicantFormatMsg['visitServerMsg'] = visitServerMsg
                } else if(welcomeImg) {
                    applicantFormatMsg['welcomeImg'] = welcomeImg
                } else {
                    applicantFormatMsg['guideLink'] = guideLink
                }
            }

            if(hasInputData) {
                guild['applicantFormatMsg'] = applicantFormatMsg
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
            const applyButton = new ButtonBuilder()
                .setCustomId('openapplicationbutton')
                .setLabel('Open Application')
                .setEmoji('🎟️') //'🎫'
                .setStyle(ButtonStyle.Danger)
            const row = new ActionRowBuilder().addComponents(applyButton)
            
            
            const embed = {
                title: 'Builder Applications',
                description: 'Click the button below to open a Builder Application and apply for our South European Builder System',
                color: resolveColor(`#${guildData.accentColor}`)
            }

            await i.channel.send({embeds: [embed], components: [row.toJSON()]})
            return i.deleteReply()
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

async function getSettingsEmbed(i : ChatInputCommandInteraction, client: Bot, guildId: string, msg: string) : Promise<Object> {
    const guildData = await Guild.findOne({id: guildId})
    client.guildsData.set(guildId, guildData)

    let embed = {
        title: 'Server settings',
        description: msg
    }

    let fields = []

    if(guildData.name) {
        fields.push({ name: 'Server name', value: (guildData.emoji) ? `${guildData.emoji} - ${guildData.name} - ${guildData.emoji}` : `${guildData.name}` })
    }

    if(guildData.submitChannel) {
        const submitChannel = await i.guild.channels.fetch(guildData.submitChannel)
        fields.push({ name: 'Submission channel', value: (submitChannel) ? `${submitChannel} (${guildData.submitChannel})` : `Invalid ID - ${guildData.submitChannel}` })
    }

    if(guildData.applicantChannel) {
        const applicantChannel = await i.guild.channels.fetch(guildData.applicantChannel)
        fields.push({ name: 'Applicant channel', value: (applicantChannel) ? `${applicantChannel} (${guildData.applicantChannel})` : `Invalid ID - ${guildData.applicantChannel}`})
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

    if(guildData.applicantFormatMsg) {
        let welcomeMsg : string[] = []
        if(guildData.applicantFormatMsg.visitServerMsg)
            welcomeMsg.push(`**VisitMsg:** ${guildData.applicantFormatMsg.visitServerMsg}`)
        if(guildData.applicantFormatMsg.welcomeImg)
            welcomeMsg.push(`**[WelcomeImg](${guildData.applicantFormatMsg.welcomeImg})**`)
        if(guildData.applicantFormatMsg.guideLink)
            welcomeMsg.push[`[**GuideLink**](${guildData.applicantFormatMsg.guideLink})`]

        if(welcomeMsg.length > 0)
            fields.push({name: 'Applicant Format Msg', value: welcomeMsg.join('\n ')})
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

    (embed as any).fields = fields

    return embed
}

export { getSettingsEmbed }