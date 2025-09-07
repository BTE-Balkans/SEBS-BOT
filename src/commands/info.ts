import Command from "../struct/Command.js"
import { getSettingsEmbed } from "./setup.js"

export default new Command({
    name: 'info',
    description: 'View current server info',
    admin: true,
    args: [],
    async run(i, client) {
        let embed = await getSettingsEmbed(i, client, i.guild.id, 'Current server info') 
        return i.editReply({embeds: [embed]})  
    }
})