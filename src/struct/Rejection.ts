import mongoose from 'mongoose'

const Rejection = mongoose.model<RejectionInterface>(
    'Rejection',
    new mongoose.Schema<RejectionInterface>({
        id: String,
        guildId: String,
        userId: String,
        submissionTime: Number,
        reviewTime: Number,
        reviewer: String,
        feedback: { type: String, maxlength: 1700 }
    })
)

export interface RejectionInterface {
    id: string
    guildId: string
    userId: string
    submissionTime: number
    reviewTime: number
    reviewer: string
    feedback: string
}

export default Rejection
