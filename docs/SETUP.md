# Setup

For the bot to properly work, each registered Discord server must be setup first. Only after that, can the guild/Discord server data be passed to the guild data. But first, if you haven't yet, start the bot and let it run for few seconds. This ensures the database is created. Once you confirmed it was created, you can stop the bot, as the next step is setting the database.

## Setting the MongoDB database
With the bot still offline, you must first insert a document into the MongoDB database (for now). Ex, if you use `MongoDB Atlas` you would:
 1. Copy your Discord server ID
 2. Open your database (under `Clusters`, click `Browse Collections` for your cluster and then navigate to your database)
 3. Click on `guilds` and insert a document, like the following:
 ```json
 {
    "_id":{ 
        "$oid":"generatedID"
    },
    "id:" "your-copied-Discord-server-ID"
}
 ```

## Setup guild data

The bot uses guild data per Discord server, which are the required preferences and input data used for the inner working of the bot and the messages the bot posts on the servers.

### Guild data overview

The guild data contains the following properties:

> - **emoji**: The emoji to use across the bot message.  
> Example for title of embeds => *🏞️- Embed title - 🏞️*
> - **name**: The name of the build team
> - **submitChannel**: The ID of the submit channel
> - **plotsChannel**: The ID of the plots channel
> - **formattingMsg**: Link to a Discord message specifying how to format a submission channel
> - **accentColor**: The color to use in embeds, containers, etc. in HEX format, ex. `#ac707e`
> - **reviewerRoles**: A list of reviewer role ID's
> - **helperRoles**: A list of helper role ID's
> - **rank(1-5)** : The builder ranks form 1 to 5 =>
>   - id: The ID of the Discord role associated with the rank
>   - points: The threshold a builder must reach to obtain the rank
>   - name: The name of the rank - ex. the name of the Discord role
> - **applicantWelcomeMsg**: Properties that control the welcome message for the applicant =>  
>   - visitServerMsg: The markdown text shown, on how to visit the build server
>   - welcomeImg: Link to an image shown in the embed
>   - guideLink: Link to the build guide for the applicant

### Prepping the Discord server
Before the guild data can be passed to the bot, the Discord server must first be prepped. As noted, rank 1 to 5 are tied to a Discord role, ex. they could be named `Novice`, `Beginner`, `Competent`, `Proficient`, `Expert`. 

#### Builder system

For the builder submission a message explaining the builder system is recommended, while a message explaining the format of the building submission message must also be sent (*take note of its link*) in this same channel. The format of the submission message is the following:
```
<Build Count>
<Geographic coordinates>
[Location/Build name (Optional)]
<Image(s) of build>
```

*Note: Marked with <> is required, while [] is optional.*
___

#### Trial system

For the applicant plots a similar channel like the builder submissions channel must be also created. Make sure only helpers and other staff roles can `View Channel` and `Send Messages`. The format of the message submitted for this channel must be:
```
<Difficulty level>
<Geographic coordinates>
<Location name, address>
<Location map link>
<Reference image of build>
```

*Note: Marked with <> is required. `Build Difficulty`, from 1 to 5, is used to determine what plot is assigned to the applicant, depending on how they rate themselves as a builder*

As for the applications, a **private** thread only channel needs to be setup. The bot must be above others roles on Its permission list and have the following permissions:
- `View Channel`
- `Manage Channel`
- `Manage Permissions`
- `Send Messages`
- `Send Messages in Threads`
- `Create Public Threads`
- `Create Private Threads`
- `Embed Links`
- `Attach Files`
- `Add Reactions`
- `Mention @everyone, ...`
- `Manage Threads`
- `Read Message History`

Other, bellow roles who want to become applicants (ex. roles assigned to users who just joined the server and performed some action, like chosen a language), must be only allowed the permissions `View Channel`, `Send Messages in Threads` and must not be allowed to `Send Messages`, `Create Public Threads` and `Create Private Threads`.
___

You will also need one channel where the `Open application` message will be sent and a channel for builders (users that have min one role which is associated with a rank from 1 to 5) to submit builder submissions to. This channel must only enable builders to `Send Messages`, while other roles can only at max `View Channel`. 

### Passing guild data

With the Discord server peppered and bot started, you can pass the gathered info (the ID's, role names, etc.) with the commands `/setup settings`, `/setup rank` etc. as noted [here](COMMANDS.md). 
> Don't forget to configure the applicant welcome message with the command '/setup applicantwelcomemsg'

Once done use the `/setup info` to confirm the server setup. 

### Trial system
For helpers to be shown in the open builder application survey, they must first be manually added. This is done via the `/setup setuphelper` command (**The user must have at min one helper role**). 
> **Note**: Once the user has been setup as helper, they cannot be removed. Only the status can be set to inactive via the `/setup helperstatus` command. This will hide the helper in the builder application survey.

Now head to the channel where you want the the `Open application` message to be shown and finally use the command `/setup openapplicationmessage`.

___
With these steps done, restart the bot once more to confirm the changes.






