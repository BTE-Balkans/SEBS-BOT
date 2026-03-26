import { ThreadChannel } from "discord.js";
import Bot from "../struct/Client.js";
import { deletedBuilderThread } from "../trial/closeApplication.js";

export default async function execute(client: Bot, thread: ThreadChannel) {
    await deletedBuilderThread(client, thread)
}