import Builder, { BuilderInterface } from "../struct/Builder.js";
import { ParticipantType, SubmissionInterface, SubmissionType } from "../struct/Submission.js";

async function updateBuildersForPurge(purgedSubmission: SubmissionInterface) {
    await purgeBuilderPointsForSubmission(purgedSubmission.userId, purgedSubmission)
    if(purgedSubmission.collaborators) {
        for(let collaborator of purgedSubmission.collaborators) {
            if(collaborator.type == ParticipantType.Member)
                await purgeBuilderPointsForSubmission(collaborator.value, purgedSubmission)
        }
    }
}

async function purgeBuilderPointsForSubmission(builderId: string, submission: SubmissionInterface) {
    const pointsIncrement = -submission.pointsTotal
        const buildingCountIncrement = (() => {
            switch (submission.submissionType) {
                case SubmissionType.MANY:
                    return (
                        -submission.smallAmt -
                        submission.mediumAmt -
                        submission.largeAmt
                    )
                case SubmissionType.ONE:
                    return -1
                default:
                    return 0
            }
        })()
        const roadKMsIncrement = -submission.roadKMs || 0
        const sqmIncrement = -submission.sqm || 0
        const soloBuildsIncrement = (submission.userId == builderId) ? -1 : 0
        const contributionsIncrement = (submission.userId != builderId) ? -1 : 0

        await Builder.updateOne(
            { id: submission.userId, guildId: submission.guildId},
            {
                $inc: {
                    pointsTotal: pointsIncrement,
                    buildingCount: buildingCountIncrement,
                    soloBuilds: soloBuildsIncrement,
                    contributions: contributionsIncrement,
                    roadKMs: roadKMsIncrement,
                    sqm: sqmIncrement
                }
            },
            { upsert: true }
        ).exec()
}

export { updateBuildersForPurge }