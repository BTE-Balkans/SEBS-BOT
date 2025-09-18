import mongoose from "mongoose"

const Helper = mongoose.model<HelperInterface>(
    'Helper',
    new mongoose.Schema<HelperInterface>({
        id: String,
        guildId: String,
        inactive: Boolean
    })
)

export interface HelperInterface {
    id: string,
    guildId: string,
    inactive: boolean
}

export default Helper