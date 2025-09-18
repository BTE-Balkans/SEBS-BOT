import mongoose from 'mongoose'

const Builder = mongoose.model<BuilderInterface>(
    'Builder',
    new mongoose.Schema<BuilderInterface>({
        id: String,
        guildId: String,
        mcUsername: String,
        rank: { type: Number, default: -1}, //-1 for applicant
        dm: { type: Boolean, default: true },
        pointsTotal: Number,
        buildingCount: Number,
        soloBuilds: Number,
        contributions: Number,
        roadKMs: Number,
        sqm: Number,
        applicantInfo: { 
            initialSelfRate: Number, 
            threadId: String, 
            helperId: String,
            closed: Boolean
        }
    })
)

export interface BuilderInterface {
    id: string
    guildId: string
    mcUsername: string
    rank: number
    dm: boolean
    pointsTotal: number
    buildingCount: number
    soloBuilds: number,
    contributions: number
    roadKMs: number
    sqm: number
    applicantInfo? : ApplicantInterface
}

export interface ApplicantInterface {
    initialSelfRate: number
    threadId: string
    helperId: string
    closed: boolean
}

export default Builder
