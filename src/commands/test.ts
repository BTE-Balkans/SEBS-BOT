import { ButtonStyle, MessageFlags } from "discord.js";
import Command from "../struct/Command.js";
import pagination, { PaginationButtonType } from "../utils/pagination.js";

export default new Command({
    name: 'test',
    description: 'Test pager',
    subCommands: [
        {
            name: 'pager',
            description: 'Test pager'
        },
        {
            name: 'getrole',
            description: 'Get role',
            args: [
                {
                    name: 'roleid',
                    description: 'ID of role',
                    required: true,
                    optionType: 'string'
                }
            ]
        }
    ],
    async run(i, client) {
        let subCommand = i.options.getSubcommand()

        if(subCommand == 'pager') {
            let pages = []

            for(let ind = 0; ind < 5; ind++) {
                pages.push({
                    title: `Page ${ind + 1}`
                })
            }

            await pagination({
                embeds: pages,
                author: i.user,
                interaction: i,
                client: client,
                ephemeral: true,
                time: 10 * 1000,
                buttons: [
                    {
                        type: PaginationButtonType.Previous,
                        label: 'Previous',
                        style: ButtonStyle.Primary
                    },
                    {
                        type: PaginationButtonType.Next,
                        label: 'Next',
                        style: ButtonStyle.Success
                    }
                ]
            })
            
        } else if(subCommand == 'getrole') {
            const roleID = i.options.getString('roleid')
            const role = await i.guild.roles?.fetch(roleID)
            return i.editReply((role) ? `Role name: ${role.name}` : `Could not find role by ID: ${roleID}`)
        }
    }
})