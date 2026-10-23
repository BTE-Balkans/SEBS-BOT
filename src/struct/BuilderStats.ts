import mongoose from "mongoose"

const BuilderStats = mongoose.model<BuilderStatsInterface>(
    'BuilderStats',
    new mongoose.Schema<BuilderStatsInterface>({
        id: String,
        guildId: String,
        pointsTotal: Number,
        buildingCount: Number,
        soloBuilds: Number,
        contributions: Number,
        roadKMs: Number,
        sqm: Number
    })
)

export interface BuilderStatsInterface {
    id: string
    guildId: string
    pointsTotal: number
    buildingCount: number
    soloBuilds: number,
    contributions: number
    roadKMs: number
    sqm: number
}

export default BuilderStats