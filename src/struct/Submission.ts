import mongoose from 'mongoose'

const Submission = mongoose.model<SubmissionInterface>(
    'Submission',
    new mongoose.Schema<SubmissionInterface>({
        id: String,
        guildId: String,
        index: Number,
        plotId: String,
        submissionType: Number,
        userId: String,
        pointsTotal: Number,
        collaborators: [{type: {type: Number, enum: [0, 1], default: 0}, value: String}],
        collaboratorsCount: Number,
        buildImages: [String], //Links to build images
        buildCount: Number,
        bonus: Number,
        edit: Boolean,
        size: Number,
        quality: Number,
        sqm: Number,
        complexity: Number,
        smallAmt: Number,
        mediumAmt: Number,
        largeAmt: Number,
        roadType: Number,
        roadKMs: Number,
        submissionTime: Number,
        reviewTime: Number,
        reviewer: String,
        feedback: { type: String, maxlength: 1700 }
    })
)

export interface SubmissionInterface {
    id: string
    guildId: string
    index: number,
    plotId?: string
    userId: string
    pointsTotal?: number
    complexity?: number
    quality?: number
    submissionType?: SubmissionType
    collaborators?: CollaboratorInterface[]
    collaboratorsCount?: number
    buildImages: string[]
    buildCount: number,
    bonus?: number
    edit?: boolean
    size?: number
    sqm?: number
    smallAmt?: number
    mediumAmt?: number
    largeAmt?: number
    roadType?: number
    roadKMs?: number
    submissionTime: number
    reviewTime?: number
    reviewer: string
    feedback?: string
}

export interface CollaboratorInterface {
    type: ParticipantType,
    value: string
}

export enum ParticipantType {
    Member = 0, //Value is ID for member
    Player = 1, //Value is Minecraft username of participant
}

export enum SubmissionType {
    ONE = 0,
    MANY = 1,
    LAND = 2,
    ROAD = 3
}

export enum BuildSize {
    small = 2,
    medium = 5,
    large = 10,
    monumental = 20
}

export default Submission
