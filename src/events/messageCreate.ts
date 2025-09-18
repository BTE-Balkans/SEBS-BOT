import { handleSubmissionMsg } from "../review/handleSubmissionMsg.js"
import { handlePlotMsg } from "../trial/handlePlotMsg.js"

export default async function execute(client, msg) {
    // ignore bot msgs
    if (msg.author.bot) {
        return
    }

    // production bot ignores test server, and test bot ignores other servers
    if (
        (!client.test && msg.guild?.id == client.guildProductionID) ||
        (client.test && msg.guild?.id != client.guildProductionID)
    ) {
        return
    }

    const guild = client.guildsData.get(msg.guild.id)
    if (!guild) return

    // if msg is not in build-submit or plots channel, ignore
    if (msg.channel.id == guild.submitChannel) {
        return await handleSubmissionMsg(client, msg, guild)
    } else if(msg.channel.id == guild.plotsChannel) {
        return await handlePlotMsg(client, msg, guild)
    }

    return
}



export { execute }
