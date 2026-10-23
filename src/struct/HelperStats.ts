import mongoose from "mongoose"

const HelperStats = mongoose.model<HelperStatsInterface>(
    'HelperStats',
    new mongoose.Schema<HelperStatsInterface>({
        id: String,
        guildId: String,
        openApps: { type: Number, default: 0 },
        closedApps: { type: Number, default: 0 },
        completedApps: { type: Number, default: 0 },
        plottedPlots: { type: Number, default: 0 }
    })
)

export interface HelperStatsInterface {
    id: string
    guildId: string
    openApps: number
    closedApps: number
    completedApps: number
    plottedPlots: number
}

export default HelperStats