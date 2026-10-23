import Guild from "../struct/Guild.js";
import GuildPlayer, { GuildPlayerInterface } from "../struct/GuildPlayer.js";
import ReviewerStats, { ReviewerStatsInterface } from "../struct/ReviewerStats.js";

/**
 * Inserts or updates reviewer statistics for a given user in a specific guild.
 * @param id The ID of the reviewer (user).
 * @param guildId The ID of the guild.
 * @param acceptances The number of accepted reviews.
 * @param rejections The number of rejected reviews.
 * @param complexityAvg The average complexity of reviews.
 * @param qualityAvg The average quality of reviews.
 * @param feedbackCharsAvg The average number of characters in feedback.
 * @param feedbackWordsAvg The average number of words in feedback.
 * @param reviews The total number of reviews.
 * @param reviewsWithFeedback The number of reviews that have feedback.
 * @returns The reviewer statistics and a boolean indicating if it was a new reviewer.
 */
async function insertReviewerStats(id: string, guildId: string, acceptances = 0, rejections = 0, complexityAvg = 0, qualityAvg = 0, feedbackCharsAvg = 0, feedbackWordsAvg = 0, reviews = 0, reviewsWithFeedback = 0) : Promise<{ 'reviewerStats': ReviewerStatsInterface, 'newReviewer': boolean}> {
    let reviewerStats = await ReviewerStats.findOne({id: id, guildId: guildId}).lean()
    let newReviewer = false
    if(!reviewerStats) {
        newReviewer = true
        await ReviewerStats.updateOne(
            {
                id: id, 
                guildId: guildId}, 
            { 
                '$set' : { 
                    'acceptances': acceptances,
                    'rejections': rejections,
                    'complexityAvg': complexityAvg,
                    'qualityAvg': qualityAvg,
                    'feedbackCharsAvg': feedbackCharsAvg,
                    'feedbackWordsAvg': feedbackWordsAvg,
                    'reviews': reviews,
                    'reviewsWithFeedback': reviewsWithFeedback,
                }
            }, 
            {upsert: true})
        reviewerStats = await ReviewerStats.findOne({id: id, guildId: guildId}).lean()
    }

    return {
        'reviewerStats': reviewerStats, 
        'newReviewer': newReviewer
    }
}

export { insertReviewerStats }