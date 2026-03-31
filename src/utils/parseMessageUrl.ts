function parseMessageUrl(url: string, urlRegex : RegExp = /^https:\/\/discord\.com\/channels\/[0-9]+\/([0-9]+)\/([0-9]+)/) {
    let m = url.match(urlRegex)
    return {
        'channelID' : m[1],
        'messageID' : m[2]
    }
}

export { parseMessageUrl }