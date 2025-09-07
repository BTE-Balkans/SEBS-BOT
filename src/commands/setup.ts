import { CacheType, ChatInputCommandInteraction, CommandInteraction } from 'discord.js'
import Command from '../struct/Command.js'
import Guild, { GuildInterface } from '../struct/Guild.js'
import Bot from '../struct/Client.js'

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
                    name: 'formattingmsg',
                    description: 'Link to formatting message',
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
            name: 'openapplicationmessage',
            description: 'Setup the open application message in a channel',
            args: [
                {
                    name: 'channelid',
                    description: 'Channel to send open application message to',
                    required: true,
                    optionType: 'string'
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

        if(subCommand == 'settings') {
            const name = options.getString('name')
            const emoji = options.getString('emoji')
            const submitchannel = options.getString('submitchannel')
            const formattingmsg = options.getString('formattingmsg')
            const addroleasreviewer = options.getString('addroleasreviewer')
            const removeroleasreviewer = options.getString('removeroleasreviewer')

            if(name || emoji || submitchannel || formattingmsg) {
                if(name) {
                    guild['name'] = name
                }
                if(emoji) {
                    guild['emoji'] = emoji
                }
                if(submitchannel) {
                    guild['submitChannel'] = submitchannel
                }
                if(formattingmsg) {
                    guild['formattingMsg'] = formattingmsg
                }
                hasInputData = true
            }

            if(addroleasreviewer || removeroleasreviewer) {
                if(addroleasreviewer == removeroleasreviewer) {
                    return i.editReply('Add and remove reviewer role is the same')
                }

                let roles : string[] = client.guildsData.get(guildId).reviewerRoles

                if(addroleasreviewer) {
                    //Check if role is already marked as reviewer
                    if(roles.includes(addroleasreviewer)) {
                        return i.editReply(`Role ${addroleasreviewer} is already marked as reviewer`)
                    } else {
                        roles.push(addroleasreviewer)
                        guild['reviewerRoles'] = roles
                        hasInputData = true
                    }
                }

                if(removeroleasreviewer) {
                    if(roles.includes(removeroleasreviewer)) {
                        roles.forEach((role, index) => {
                            if(role == removeroleasreviewer)
                                roles.splice(index, 1)
                        })

                        guild['reviewerRoles'] = roles
                        hasInputData = true
                    }
                }
            }

        } else if (subCommand == 'rank') {
            const level : number = options.getInteger('level')
            //Check if the level if valid
            if(level >= 1 && level <= 5) {
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
            } else {
                return i.editReply('Input level is invalid. Must be between 1 and 5')
            }

        } else if(subCommand == 'openapplicationmessage') {
            const embed = {
                title: 'Builder Applications',
                description: 'Click the button below to open a Builder Application and apply for our South European Builder System'
            }
        }

        if(hasInputData) {
            Guild.updateOne({id: guildId}, { '$set' : guild}, { upsert: true}).then(async (res) => {
                let embed = await getSettingsEmbed(i, client, guildId, 'Server settings successfully set!')
                return i.editReply({embeds: [embed]})
            }).catch((err) => {
                if(err) {
                    console.log(err)
                    return i.editReply('Error while updating settings: ' +  err.message)
                }
            })
        }else {
            return i.editReply('No setting options provided')
        }
    }
})

async function getSettingsEmbed(i : ChatInputCommandInteraction, client: Bot, guildId: string, msg: string) : Promise<Object> {
    const guild = await Guild.findOne({id: guildId})
    client.guildsData.set(guildId, guild)

    let embed = {
        title: 'Server settings',
        description: msg
    }

    let fields = []

    if(guild.name) {
        fields.push({ name: 'Server name', value: (guild.emoji) ? `${guild.emoji} - ${guild.name} - ${guild.emoji}` : `${guild.name}` })
    }

    if(guild.submitChannel) {
        const submitChannel = await i.guild.channels.fetch(guild.submitChannel)
        if(submitChannel)
            fields.push({ name: 'Submission channel', value: `${submitChannel} (${guild.submitChannel})` })
    }

    if(guild.formattingMsg) {
        fields.push({ name: 'Formatting message', value: guild.formattingMsg })
    }

    if(guild.reviewerRoles && guild.reviewerRoles.length > 0) { 
        let roles = ''
        for(let r = 0; r < guild.reviewerRoles.length; r++) {
            const roleID = guild.reviewerRoles.at(r)
            const role = await i.guild.roles?.fetch(roleID)
            if(role)
                roles += (r > 0) ? `\n${role} (${roleID})` : `${role} (${roleID})` 
        }
        fields.push({name: `Reviewer roles`, value: roles})
    }

    for(let i = 1; i <= 5; i++) {
        if(guild['rank' + i]) {
            const rank = guild['rank' + i]
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