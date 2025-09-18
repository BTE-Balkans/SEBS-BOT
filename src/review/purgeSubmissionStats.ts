import Submission, { SubmissionInterface, SubmissionType } from "../struct/Submission.js";

/**
 * Purge the stats of the submission that are tied to It's type
 * @param originalSubmission The original submission data
 */
function purgeSubmissionStats(originalSubmission: SubmissionInterface, submissionType: SubmissionType) {
    //First delete the stats tied to the type
    switch(submissionType) {
        case SubmissionType.ONE:
            delete originalSubmission.size
            delete originalSubmission.quality
            delete originalSubmission.complexity
            break
        case SubmissionType.MANY:
            delete originalSubmission.smallAmt
            delete originalSubmission.mediumAmt
            delete originalSubmission.largeAmt
            delete originalSubmission.quality
            delete originalSubmission.complexity
            break
        case SubmissionType.LAND:
            delete originalSubmission.complexity
            delete originalSubmission.quality
            break
        case SubmissionType.ROAD:
            delete originalSubmission.roadType
            delete originalSubmission.roadKMs
            delete originalSubmission.complexity
            delete originalSubmission.quality
            break
    }
}

export { purgeSubmissionStats }