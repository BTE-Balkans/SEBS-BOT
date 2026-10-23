import { CommandInteraction } from 'discord.js'
import GuildPlayer, { GuildPlayerInterface } from '../struct/GuildPlayer.js'
import ReviewerStats, { ReviewerStatsInterface } from '../struct/ReviewerStats.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'
import { countWords } from '../utils/countWords.js'
import Rejection from '../struct/Rejection.js'
import { insertReviewerStats } from './insertReviewerStats.js'

async function updateReviewerAverages(reviewer: GuildPlayerInterface) {

    let averages = await Submission.aggregate([
        {
            $match: {
                $and: [
                    { reviewer: reviewer.id },
                    { guildId: reviewer.guildId }
                ]
            }
        },
        {
            $group: {
                _id: '$reviewer',
                quality_average: { $avg: '$quality' },
                complexity_average: { $avg: '$complexity' }
            }
        }
    ])

    let submissionFeedback = await Submission.aggregate([
        {
            $match: {
                $and: [
                    { reviewer: reviewer.id },
                    { guildId: reviewer.guildId },
                    { feedback: { $exists: true } }
                ]
            }
        }, {
            $group: {
                _id: '$reviewer',
                total: { $sum: 1 },
                feedback_chars: { $sum: { $strLenCP: '$feedback' } },
                feedback_words: { $sum: { $size: { $split: ['$feedback', ' '] } } }
            }
        }
    ])

    let rejectionFeedback = await Rejection.aggregate([
        {
            $match: {
                $and: [
                    { reviewer: reviewer.id },
                    { guildId: reviewer.guildId },
                    { feedback: { $exists: true } }
                ]
            }
        },
        {
            $group: {
                _id: '$reviewer',
                total: { $sum: 1 },
                feedback_chars: { $sum: { $strLenCP: '$feedback' } },
                feedback_words: { $sum: { $size: { $split: ['$feedback', ' '] } } }
            }
        }
    ])

    let feedbackCharsAverage = 0
    let feedbackWordsAverage = 0
    let complexityAverage = 0
    let qualityAverage = 0

    if (submissionFeedback[0] != undefined && rejectionFeedback[0] != undefined) {
        feedbackCharsAverage = (submissionFeedback[0].feedback_chars + rejectionFeedback[0].feedback_chars) / (submissionFeedback[0].total + rejectionFeedback[0].total)
        feedbackWordsAverage = (submissionFeedback[0].feedback_words + rejectionFeedback[0].feedback_words) / (submissionFeedback[0].total + rejectionFeedback[0].total)
    }

    if (averages[0] != undefined) {
        complexityAverage = averages[0].complexity_average
        qualityAverage = averages[0].quality_average
    }

    await ReviewerStats.updateOne({
        id: reviewer.id,
        guildId: reviewer.guildId
    }, {
        $set: {
            complexityAvg: complexityAverage,
            qualityAvg: qualityAverage,
            feedbackCharsAvg: feedbackCharsAverage,
            feedbackWordsAvg: feedbackWordsAverage
        }
    }).exec()
}

/**
 * update reviewer doc for an accepted review including edits
 * @param originalSubmission
 * @param submissionData
 * @param i
 */
async function updateReviewerForAcceptance(
    originalSubmission: SubmissionInterface,
    submissionData: SubmissionInterface,
    i: CommandInteraction
) {
    // if review is edit, get previous reviewer stats and remove the original review from it
    // do this first in case editor is same as reviewer: this order of doing things works properly
    if (submissionData.edit) {
        await updateReviewerForPurge(originalSubmission)
    }

    // now that edit thing is done, add new stats to reviewer
    // get the reviewer to update it
    const reviewer: GuildPlayerInterface = await GuildPlayer.findOne({
        id: submissionData.reviewer,
        guildId: submissionData.guildId
    }).lean()

    // if reviewer is brand-new fresh out of the oven newbie, don't need to calculate avgs
    let insert = await insertReviewerStats(
        submissionData.reviewer, 
        submissionData.guildId,
        1, 
        0, 
        submissionData.complexity, 
        submissionData.quality,
        submissionData.feedback.length,
        countWords(submissionData.feedback), 
        1, 
        1
    )
    if (!insert.newReviewer) {
        // otherwise, reviewer already has stats so update the avgs and everything
        await updateReviewerAverages(reviewer)

        // otherwise, increment acceptances, reviews, with feedback, and set avgs to new avg
        await ReviewerStats.updateOne(
            {
                id: submissionData.reviewer,
                guildId: submissionData.guildId
            },
            {
                $inc: {
                    acceptances: 1,
                    reviews: 1,
                    reviewsWithFeedback: 1
                }
            }
        ).exec()
    }
}

/**
 * update reviewer stats for a declined review, add the feedback to their stats
 * @param reviewer
 * @param feedback
 */
async function updateReviewerForRejection(reviewer: GuildPlayerInterface, feedback: string) {
    // add feedback to the reviewer's avgs
    await updateReviewerAverages(reviewer)

    // add a rejection and a review
    await ReviewerStats.updateOne(
        {
            id: reviewer.id,
            guildId: reviewer.guildId
        },
        {
            $inc: {
                rejections: 1,
                reviews: 1,
                reviewsWithFeedback: 1
            }
        }
    ).exec()
}

/**
 * remove a review from a reviewer's stats
 * @param purgedSubmission the submission that will be removed
 */
async function updateReviewerForPurge(purgedSubmission: SubmissionInterface) {
    // get the reviewer to purge
    const reviewer: GuildPlayerInterface = await GuildPlayer.findOne({
        id: purgedSubmission.reviewer,
        guildId: purgedSubmission.guildId
    }).lean()

    // update old reviewer stats by removing the review from their stats
    await ReviewerStats.updateOne(
        { id: reviewer.id, guildId: purgedSubmission.guildId },
        {
            $inc: {
                acceptances: -1,
                reviews: -1,
                reviewsWithFeedback: -1
            }
        }
    ).exec()

    // update old reviewer stats pt 2 because mongoose cant $set and $inc in 1 query
    await updateReviewerAverages(reviewer)
}

export { updateReviewerForAcceptance, updateReviewerForRejection, updateReviewerForPurge }
