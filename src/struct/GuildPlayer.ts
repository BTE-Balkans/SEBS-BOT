import mongoose from "mongoose"
import { SystemRole } from "./Guild.js"


const GuildPlayer = mongoose.model<GuildPlayerInterface>(
    'GuildPlayer',
    new mongoose.Schema<GuildPlayerInterface>({
        id: String,
        guildId: String,
        rank: { type: Number, default: -1}, //-1 for non-builder
        roles: { type: [Number], enum: SystemRole, default: []},
        dm: { type: Boolean, default: true },
        meta: String
    })
)

export interface GuildPlayerInterface {
    id: string
    guildId: string
    rank: number
    roles: SystemRole[]
    dm: boolean
    meta: string
}

export default GuildPlayer