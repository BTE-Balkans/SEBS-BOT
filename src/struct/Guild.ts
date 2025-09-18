import mongoose from 'mongoose'

const Guild = mongoose.model<GuildInterface>(
    'Guild',
    new mongoose.Schema<GuildInterface>({
        id: String,
        emoji: String,
        name: String,
        submitChannel: String,
        applicantChannel: String,
        plotsChannel: String,
        formattingMsg: String,
        accentColor: String,
        reviewerRoles: [String],
        helperRoles: [String],
        rank1: { id: String, points: Number, name: String },
        rank2: { id: String, points: Number, name: String },
        rank3: { id: String, points: Number, name: String },
        rank4: { id: String, points: Number, name: String },
        rank5: { id: String, points: Number, name: String },
        applicantFormatMsg: { visitServerMsg: String, welcomeImg: String, guideLink: String }
    })
)

export interface GuildInterface {
    id: string
    emoji: string
    name: string
    submitChannel: string
    applicantChannel: string
    plotsChannel: string
    formattingMsg: string
    accentColor: string
    reviewerRoles: string[]
    helperRoles: string[]
    rank1: Rank
    rank2: Rank
    rank3: Rank
    rank4: Rank
    rank5: Rank
    applicantFormatMsg: ApplicantFormatMessage
}

export interface Rank {
    id: string
    points: number
    name: string
}

export interface ApplicantFormatMessage {
    visitServerMsg: string
    welcomeImg: string
    guideLink: string
}

export default Guild
