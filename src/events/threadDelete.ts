import { ThreadChannel } from "discord.js";
import Bot from "../struct/Client.js";
import { deletedApplicantThread } from "../trial/closeApplicantThread.js";

export default async function execute(client: Bot, thread: ThreadChannel) {
    await deletedApplicantThread(client, thread)
}