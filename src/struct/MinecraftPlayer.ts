import mongoose from 'mongoose'

const MinecraftPlayer = mongoose.model<MinecraftPlayerInterface>(
    'MinecraftPlayer',
    new mongoose.Schema<MinecraftPlayerInterface>({
        id: String,
        uuid: String,
        username: { type: String, minLength: 3, maxLength: 16}
    })
)

export interface MinecraftPlayerInterface {
    id: string
    uuid?: string
    username: string
}

export default MinecraftPlayer