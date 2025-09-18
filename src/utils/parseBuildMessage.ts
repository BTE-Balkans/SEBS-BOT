import { Message } from "discord.js";
import { CollaboratorInterface, ParticipantType, SubmissionInterface } from "../struct/Submission.js";
import Builder, { BuilderInterface } from "../struct/Builder.js";
import { checkMinecraftUsername } from "./ensureBuilderMinecraftUsername.js";

const coordsRegex =
        /^(\s*[(]?[-+]?([1-8]+\d\.(\d+)?|90(\.0+))\xb0?,?\s+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]+\d))\.(\d+))\xb0?\s*)|(\s*(\d{1,3})\s*(?:°|d|º| |g|o)\s*([0-6]?\d)\s*(?:'|m| |´|’|′))/

const urlRegex =
        /^(http|https):\/\/[a-z]+.[a-z]+.[a-z]+.+/

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
async function parseBuildMessage(msg: Message, parseUrlLine = false, parseContributorsLine = false, numberRegex = /^[0-9]+/, mcUsernameRegex = /^[a-zA-Z0-9_]{3,16}/) {
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
                                let member = await msg.guild.members.fetch(memberId)
                            }catch(err) {
                                error = `MEMBER WITH ID \`${memberId}\` NOT FOUND`
                                break
                            }

                            //Check if the member was not yet added to the temp members array
                            if(!members.includes(memberId) && memberId != msg.author.id)
                                members.push(memberId)
                        } else if(!contributor.includes('-') && numberRegex.test(contributor)) { //Check if the string item doesn't contain minus and is a number
                            let c = parseInt(contributor)
                            //Ensure that the count is not 0
                            if(c == 0)
                                c = 1
                            //Check if the contributors count is less then 100, given the unusual high number, 
                            //and Minecraft usernames can contain only contain 3 digits as well
                            if(count < 100) {
                                //Add it to total count, to avoid multiple entries of type ParticipantType.Contributors in the returned array
                                //This also ensures this entry is in the last
                                contributorsCount += count
                            } else {
                                error = `INVALID CONTRIBUTORS COUNT (${contributor}>99)`
                                break
                            }
                        }
                    }
                    
                    //Exit the loop if error is set
                    if(error && error != '')
                        continue

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
                        let builder : BuilderInterface = await Builder.findOne({guildId: msg.guildId, mcUsername: mcUsername}).lean()
                        //If such builder exists, remove the username from mcUsernames and add the builder to the members array 
                        if(builder) {
                            mcUsernames.splice(mcUsernames.indexOf(mcUsername), 1)
                            //Check that the builder id is different from the submission author
                            if(builder.id != msg.author.id)
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
 * Check if each new build property is deferent from the original one and is in the correct format
 * If It's not, mark the parsed as false, and the updated property as false. 
 * 
 * Ex, if the new coords is different from the original, but It's invalid, the returned `updatedCoordsLine` is false
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
 *      parsed': boolean,
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
function parseEditBuild(newCount: number, orgCount: number, newCoords: string, orgCoords: string, newAddress: string, orgAddress: string, checkUrl: boolean = false, newUrl: string = null, orgUrl: string = null) {
    let count : number
    let updatedCountLine = null
    let coords : string
    let updatedCoordsLine = null
    let address : string
    let updatedAddressLine = null
    let url: string
    let updatedUrlLine = null
    
    let parsed = true

    if(newCount != null && newCount != orgCount) {
        updatedCountLine = true
        count = newCount
    }

    if(newCoords != null && newCoords != orgCoords) {
        if(coordsRegex.test(newCoords)) {
            updatedCoordsLine = true
            coords = newCoords
        }else {
            parsed = false;
            updatedCoordsLine = false;
        }
    }

    if(newAddress != null && newAddress != orgAddress) {
        updatedAddressLine = true
        address = newAddress
    }

    if(checkUrl && newUrl != null && newUrl != orgUrl) {
        if(urlRegex.test(newUrl)) {
            updatedUrlLine = true;
            url = newUrl
        }else {
            updatedUrlLine = false
            parsed = false
        }
    }

    return {
        'parsed': parsed,
        'count': count,
        'updatedCountLine': updatedCountLine,
        'coords': coords,
        'updatedCoordsLine': updatedCoordsLine,
        'address': address,
        'updatedAddressLine': updatedAddressLine,
        'url' : url,
        'updatedUrlLine' : updatedUrlLine
    }
}

export { parseBuildMessage, parseEditBuild}