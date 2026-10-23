import mongoose from 'mongoose'

const Guild = mongoose.model<GuildInterface>(
    'Guild',
    new mongoose.Schema<GuildInterface>({
        id: String,
        emoji: String,
        name: String,
        submitChannel: String,
        buildersChannel: String,
        plotsChannel: String,
        formattingMsg: String,
        accentColor: String,
        roles: { type: [ new mongoose.Schema({id: {type: Number, enum: [0, 1, 2, 3, 4, 5, 6, 7, 8]}, roles: [String]}, { _id: false })], default: [] },
        rank1: { id: String, points: Number, name: String },
        rank2: { id: String, points: Number, name: String },
        rank3: { id: String, points: Number, name: String },
        rank4: { id: String, points: Number, name: String },
        rank5: { id: String, points: Number, name: String },
        applicationFormatMsg: { visitServerMsg: String, welcomeImg: String, guideLink: String }
    })
)

export interface GuildInterface {
    id: string
    emoji: string
    name: string
    submitChannel: string
    buildersChannel: string
    plotsChannel: string
    formattingMsg: string
    accentColor: string
    roles: SystemGuildRoles[]
    rank1: Rank
    rank2: Rank
    rank3: Rank
    rank4: Rank
    rank5: Rank
    applicationFormatMsg: ApplicationFormatMessage
}

export enum SystemRole {
    Admin = 0,
    Staff = 1,
    Moderator = 2,
    Helper = 3,
    Media = 4,
    Reviewer = 5,
    Mayor = 6,
    Builder = 7,
    Applicant = 8
}

export interface SystemGuildRoles {
    id: SystemRole
    roles: string[]
}

export interface Rank {
    id: string
    points: number
    name: string
}

export interface ApplicationFormatMessage {
    visitServerMsg: string
    welcomeImg: string
    guideLink: string
}

export default Guild
