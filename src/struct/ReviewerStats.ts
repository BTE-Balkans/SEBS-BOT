import mongoose from "mongoose"

const ReviewerStats = mongoose.model<ReviewerStatsInterface>(
    'ReviewerStats',
    new mongoose.Schema<ReviewerStatsInterface>({
        id: String,
        guildId: String,
        reviews: Number,
        reviewsWithFeedback: Number,
        rejections: Number,
        acceptances: Number,
        feedbackWordsAvg: Number,
        feedbackCharsAvg: Number,
        qualityAvg: Number,
        complexityAvg: Number
    })
)

export interface ReviewerStatsInterface {
    id: string
    guildId: string
    reviews: number
    reviewsWithFeedback: number
    rejections: number
    acceptances: number
    feedbackWordsAvg: number
    feedbackCharsAvg: number
    qualityAvg: number
    complexityAvg: number
}

export default ReviewerStats