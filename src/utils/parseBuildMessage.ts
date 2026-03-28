import { Guild, Message } from "discord.js";
import { CollaboratorInterface, ParticipantType, SubmissionInterface } from "../struct/Submission.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { checkMinecraftUsername } from "./ensureBuilderMinecraftUsername.js";
import { Plot } from "../struct/Plot.js";
import { GuildInterface } from "../struct/Guild.js";
import { error } from "console";

const coordsRegex =
        /^(\s*[(]?[-+]?([1-8]+\d\.(\d+)?|90(\.0+))\xb0?,?\s+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]+\d))\.(\d+))\xb0?\s*)|(\s*(\d{1,3})\s*(?:°|d|º| |g|o)\s*([0-6]?\d)\s*(?:'|m| |´|’|′))/

const urlRegex =
        /^(http|https):\/\/[a-z]+.[a-z]+.[a-z]+.+/

const mcUsernameRegex = /^[a-zA-Z0-9_]{3,16}/

/**
 * Parse a build message, line by line, with an optional parsing of a url
 * @param msg The message that contains the parameters in the content
 * @param parseUrlLine If the additional, fourth line, containing the url should be parsed
 * @param parseContributorsLine If the contributors line should be parsed
 * @param [numberRegex=/^[1-9]+/] The regex to check the first line (count) against
 * @param [mcUsernameRegex=/^[a-zA-Z0-9_]{3,16}/] The regex to check the Minecraft usernames against in the contributors line
 * @returns An object {
        error: boolean,
        count: number,
        hasCountLine: boolean,
        coords: string,
        hasCoordsLine: boolean,
        address: string,
        hasAddressLine: boolean,
        mapUr : string,
        hasUrlLine : boolean
        contributorsCount : string = 1
        contributors: CollaboratorInterface[] = []
        hasContributorsLine :boolean = false
    }
 */
async function parseBuildMessage(msg: Message, parseUrlLine = false, parseContributorsLine = false, numberRegex = /^[0-9]+/) {
    let count : number
    let hasCountLine = false
    let coords : string
    let hasCoordsLine = false
    let address : string
    let hasAddressLine = false
    let mapUrl: string
    let hasUrlLine = false
    let contributorsCount = 1 //The builder itself
    let contributors: CollaboratorInterface[] = []
    let hasContributorsLine = false
    
    let error : string

    // split submission msg by each new line
    const lines = msg.content.split('\n')

    //Check for empty content
    if(lines.length == 0)
        error = 'EMPTY INFO'

    //Check if the num lines is not the min 3 required 
    if(error != '' && lines.length < 3)
        error = 'MISSING INFO'

    if(!error) {
        // check content of each line of msg if they contain valid coordinates and other info
        for(let l = 0; l < lines.length; l++)  {
            let line = lines.at(l).replace(/#/g, '')
            if (l == 0) { //Check if count is set
                hasCountLine = true
                if(numberRegex.test(line) === true) {
                    count = parseInt(line)
                    if(count == 0) {
                        error = ''
                        break
                    }
                } else {
                    error = ''
                    break
                }
            } else if(l == 1) { //Check if coords are set
                hasCoordsLine = true
                if(coordsRegex.test(line) === true)
                    coords = line
                else {
                    error = ''
                    break
                }
            } else if(l == 2) { //Check if address is set
                hasAddressLine = true
                address = line
                if(address.length == 0) {
                    error = ''
                    break
                }
            } else if(l == 3 && (parseUrlLine || parseContributorsLine)) { //Only Check url or contributors if parseUrlLine or parseContributorsLine is true
                if(parseUrlLine) {
                    hasUrlLine = true
                    if(urlRegex.test(line))
                        mapUrl = line
                    else {
                        error = ''
                        break
                    }
                }else {
                    hasContributorsLine = true
                    
                    if(line.replace(' ', '').length == 0){
                        error = ''
                        break
                    }
                        
                    //Parse the contributors line to a string array
                    let rawContributors = line.split(' ')

                    const res = await parseContributors(rawContributors , numberRegex, msg.guild, msg.author.id)

                    //Exit if error is set
                    if(res.error && res.error != '') {
                        error = res.error
                        break
                    }

                    contributors = res.contributors
                    contributorsCount += res.contributorsCount
                }
            }

            if(error)
                break

        }
    }

    return {
        'error': error,
        'count': count,
        'hasCountLine': hasCountLine,
        'coords': coords,
        'hasCoordsLine': hasCoordsLine,
        'address': address,
        'hasAddressLine': hasAddressLine,
        'mapUrl' : mapUrl,
        'hasUrlLine' : hasUrlLine,
        'contributorsCount': contributorsCount,
        'contributors' : contributors,
        'hasContributorsLine': hasContributorsLine
    }
}

/**
 * Parse the raw contributors line (@members usernames count) to contributors and contributorsCount
 * @param rawContributors And array of the raw contributors
 * @param error 
 * @param numberRegex 
 * @param guild 
 * @param authorId 
 * @returns 
 */
async function parseContributors(rawContributors : string[], numberRegex: RegExp, guild: Guild, authorId: string) {
    let contributors: CollaboratorInterface[] = []
    let contributorsCount = 0
    let error : string

    //Array to temp store the Minecraft usernames and User ID's
    let mcUsernames : string[] = []
    let members : string[] = []

    for(let contributor of rawContributors) {

        //Check if the string item is a Minecraft java username and was not yet added to the temp mc usernames array
        if(mcUsernameRegex.test(contributor) && contributor.length >= 3 && contributor.length <= 16) {
            if(!mcUsernames.includes(contributor))
                mcUsernames.push(contributor)
        } else if(contributor.startsWith('@')) {
            error = `INVALID USER TAG \`${contributor}\``
            break
        } else if(contributor.startsWith('<@')) { //Check if the sting item is a tagged member
            let memberId = contributor.slice(2, contributor.length - 1)
            //Check if the tagged member exists
            try {
                let member = await guild.members.fetch(memberId)
            }catch(err) {
                error = `MEMBER WITH ID \`${memberId}\` NOT FOUND`
                break
            }

            //Check if the member was not yet added to the temp members array
            if(!members.includes(memberId) && memberId != authorId)
                members.push(memberId)
        } else if(!contributor.includes('-') && numberRegex.test(contributor)) { //Check if the string item doesn't contain minus and is a number
            let c = parseInt(contributor)
            //Ensure that the count is not 0
            if(c == 0)
                c = 1
            //Check if the contributors count is less then 100, given the unusual high number, 
            //and Minecraft usernames can contain only contain 3 digits as well
            if(c < 100) {
                //Add it to total count, to avoid multiple entries of type ParticipantType.Contributors in the returned array
                //This also ensures this entry is in the last
                contributorsCount += c
            } else {
                error = `INVALID CONTRIBUTORS COUNT (${contributor}>99)`
                break
            }
        }
    }

    //Only continue if error is not set
    if(!error || error == '') {

        //Validate the minecraft usernames
        for(let mcUsername of mcUsernames) {
            try {
                let res = checkMinecraftUsername(mcUsername)
                if(!res)
                    error = `INVALID MINECRAFT USERNAME: \`${mcUsername}\`. ${res['message']}`
            }catch(err) {
                error = `ERROR WHILE FETCHING MINECRAFT USER INFO: \n ${err}`
            }

            //Check if the Minecraft username is tied to an existing tracked builder
            let builder : BuilderInterface = await Builder.findOne({guildId: guild.id, mcUsername: mcUsername}).lean()
            //If such builder exists, remove the username from mcUsernames and add the builder to the members array 
            if(builder) {
                mcUsernames.splice(mcUsernames.indexOf(mcUsername), 1)
                //Check that the builder id is different from the submission author
                if(builder.id != authorId)
                    members.push(builder.id)
            }
        } 

        //Add the members and minecraft usernames to the collaborators
        for(let member of members)
            contributors.push({ type: ParticipantType.Member, value: member})
        for(let mcUsername of mcUsernames)
            contributors.push({ type: ParticipantType.Player, value: mcUsername})

        //Add the contributors size to the contributors count
        contributorsCount += contributors.length
    }

    return {
        'error': error,
        'contributorsCount': contributorsCount,
        'contributors' : contributors
    }
}

/**
 * Check if each new build property is deferent from the original one and is in the correct format
 * If It's not, mark the parsed as false, and the updated property as false. 
 * 
 * Ex, if the new coords is different from the original, but It's invalid, the returned `updatedCoordsLine` is false
 * @param guildData Guild data
 * @param newCount The new count, else null
 * @param orgCount The original count value
 * @param newCoords The new coord, else null
 * @param orgCoords The original coords
 * @param newAddress The new address, else null
 * @param orgAddress The original address
 * @param checkUrl If to check the url param (optional)
 * @param newUrl The new url, else null (optional)
 * @param orgUrl The original url (optional)
 * @returns An object {
 *      error: string
        count: number,
        updatedCountLine: boolean,
        coords': string,
        updatedCoordsLine: boolean,
        address: string,
        updatedAddressLine: boolean,
        url : string,
        updatedUrlLine : boolean
    }
 */
async function parseEditBuild(guildData: GuildInterface, newCount: number, orgCount: number, newCoords: string, orgCoords: string, newAddress: string, orgAddress: string, checkUrl: boolean = false, newUrl: string = null, orgUrl: string = null) {
    let count : number
    let hasCount : string
    let coords: string
    let hasCoords : string
    let address : string
    let hasAddress : string
    let url: string
    let hasUrl : string
    
    let error = false

    if(newCount != null && newCount != orgCount) {
        hasCount = ''
        count = newCount

        if(count == 0) {
            hasCount = 'Count is zero'
            error = true
        }
    }

    if(newCoords != null && newCoords.trim() != '' && newCoords.trim() != orgCoords) {
        hasCoords = ''
        if(coordsRegex.test(newCoords.trim())) {
            coords = newCoords.trim()

            //Find if any plot with these coords already exist
            let res = await Plot.exists({guildId: guildData.id, coords: newCoords})
            if(res) {
                hasCoords = 'Duplicate coordinates'
                error = true
            }

        }else {
            hasCoords = `Invalid or unrecognized coordinates: ${newCoords}`
            error = true
        }
    }

    if(newAddress != null && newAddress.trim() != '' && newAddress.trim() != orgAddress) {
        hasAddress = ''
        address = newAddress.trim()

        //Find if any plot with this address already exists
        let res = await Plot.exists({guildId: guildData.id, address: address})
        if(res) {
            hasAddress = 'Duplicate address'
            error = true
        }
    }

    if(checkUrl && newUrl != null && newUrl != '' && newUrl.trim() != orgUrl) {
        hasUrl = ''
        if(urlRegex.test(newUrl)) {
            url = newUrl.trim()
        }else {
            hasUrl = 'Invalid url'
            error = true
        }
    }

    return {
        'error': error,
        'count': count,
        'hasCount': hasCount,
        'coords': coords,
        'hasCoords': hasCoords,
        'address': address,
        'hasAddress': hasAddress,
        'url' : url,
        'hasUrl' : hasUrl
    }
}

export { parseBuildMessage, parseContributors, parseEditBuild}