import { Attachment, AttachmentBuilder } from "discord.js";

/**
 * Download an attachment and return the the attachment builder for it
 * @param attachmentUrl The url to a file
 * @param attachmentName The name of the file
 * @returns The attachment builder of the downloaded content
 */
async function downloadAttachment(attachmentUrl: string, attachmentName: string) : Promise<AttachmentBuilder> {
    const resp = await fetch(attachmentUrl)
    if(!resp.ok)
        throw new Error(`STATUS: ${resp.statusText}`)

    const arr = await resp.arrayBuffer()
    const imageBuffer = Buffer.from(arr)
    return new AttachmentBuilder(imageBuffer).setName(attachmentName.replace(' ', '-'))
}

export { downloadAttachment }