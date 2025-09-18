import Rejection, { RejectionInterface } from '../struct/Rejection.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'

/**
 * Check whether a submission has been accepted
 * @param {string} submissionId - The message id of the submission
 * @param {string} guildID - The ID of the guild 
 * @returns true if the submission is in the submissions db
 */
async function checkIfAccepted(submissionId: string, guildID: string) {
    const submission: SubmissionInterface = await Submission.findOne({id: submissionId, guildId: guildID}).lean()

    if (submission && submission.feedback != null) {
        return true
    }
}

/**
 * Check whether a submission has been rejected
 * @param {string} submissionId - The message id of the submission
 * @param {string} guildID - The ID of the guild 
 * @returns true if the submission is in the rejections db
 */
async function checkIfRejected(submissionId: string, guildID: string) {
    const submission: RejectionInterface = await Rejection.findOne({id: submissionId, guildId: guildID}).lean()

    if (submission) {
        return true
    }
}

export { checkIfAccepted, checkIfRejected }
