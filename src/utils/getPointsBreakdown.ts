import { BuildSize, SubmissionInterface, SubmissionType } from "../struct/Submission.js";

/**
 * Return the submissions stats by their name depending on the submission type
 * @param submission The submission with the points assigned
 * @returns An array of objects {name: string, value: string }
 */
function getPointsBreakdown(submission: SubmissionInterface) : {name: string, value: string }[] {
    let pointsBreakdown : {name: string, value: string }[] = []

    switch(submission.submissionType) {
        case SubmissionType.ONE: 
            pointsBreakdown.push({name: 'Building type', value: BuildSize[submission.size]})
            break
        case SubmissionType.MANY:
            pointsBreakdown.push({name: 'Number of buildings (S/M/L)', value: `${submission.smallAmt}/${submission.mediumAmt}/${submission.largeAmt}`})
            break
        case SubmissionType.LAND:
            pointsBreakdown.push({name: 'Land area', value: `${submission.sqm} sqm`})
        case SubmissionType.ROAD:
            pointsBreakdown.push(
                    { name: 'Road type', value: `${submission.roadType}`},
                    { name: 'Distance', value: `${submission.roadKMs} km`}
                )
            break
    }

    pointsBreakdown.push({name: 'Quality multiplier', value: `${submission.quality}`})
    pointsBreakdown.push({name: 'Complexity multiplier', value: `${submission.complexity}`})
    pointsBreakdown.push({name: 'Bonus multiplier', value: `${submission.bonus}`})



    return pointsBreakdown
}

export { getPointsBreakdown }