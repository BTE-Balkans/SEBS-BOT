import mongoose from "mongoose"

const Application = mongoose.model<ApplicationInterface>(
    'Application',
    new mongoose.Schema<ApplicationInterface>({
        id: String,
        guildId: String,
        initialSelfRate: Number, 
        threadId: String, 
        helperId: String,
        applicationClosed: { type: Boolean, default: false }
    })
)

export interface ApplicationInterface {
    id: string
    guildId: string
    initialSelfRate: number
    threadId: string
    helperId: string
    applicationClosed: boolean
}

export default Application