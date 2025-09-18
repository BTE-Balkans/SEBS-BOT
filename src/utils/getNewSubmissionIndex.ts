import { GuildInterface } from "../struct/Guild.js"
import Submission, { SubmissionInterface } from "../struct/Submission.js"

async function getNewSubmissionIndex(guildData: GuildInterface) {
    let lastSubmission : SubmissionInterface = await Submission.findOne({guildId: guildData.id}).sort('-submissionTime').lean()
    if(lastSubmission?.submissionTime)
        return lastSubmission.index + 1

    return 1
}

export { getNewSubmissionIndex}