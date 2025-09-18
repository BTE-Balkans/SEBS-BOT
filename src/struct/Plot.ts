import mongoose from "mongoose"
import { SubmissionInterface } from "./Submission.js"

const Plot = mongoose.model<PlotInterface>(
    'Plot',
    new mongoose.Schema<PlotInterface>({
        id: String,
        guildId: String,
        difficulty: Number,
        refPhoto: String,
        mapUrl: String,
        plotter: String,
        builder: String,
        dateAdded: Number,
        coords: String,
        address: String,
        taskmsg: String
    })
)

export interface PlotInterface {
    id: string
    guildId: string
    difficulty: number
    refPhoto: string
    mapUrl: string
    plotter: string
    builder: string
    dateAdded: number
    coords: string
    address: string
    taskmsg?: string
}

export { Plot }