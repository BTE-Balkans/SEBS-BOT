import Submission from "../struct/Submission.js"

async function getSubmissionClaimer(submissionID: string, guildID: string) : Promise<string> {
    const submission = await Submission.findOne({id: submissionID, guildId: guildID}).lean()
    if(submission && submission.reviewer)
        return submission.reviewer

    return null
}

export { getSubmissionClaimer }