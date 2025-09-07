# SEBS Bot.

Welcome to the **South European Build System** bot, a bot for `BTE Team Balkans`. This bot was made based on the [NABS-BOT](https://github.com/BTE-Canada-USA/NASBS-BOT) with additional features and upgrades, like the use of `discord.js v14`, use of a custom `paginator`, by default direct messages with updates to builders who submit builds (can be turned off per builder), etc..

## Permissions
The bot uses the following intents:
- Guilds (Access to guilds info)
- Guild members (Access to guild members info)
- Guild messages (Access to guild messages)
- Guild message reactions (Access to reactions in guild messages)
- Direct messages (Direct messaging to users)

## Commands
The bot offers 11 commands, with more to come in the future. Some are public, some are for reviewers only and some are admin only.
> Note: Parameters marked with [] are optional, as oppose to ones marked with <>

### 1. Setup command
Setup the bot for the server, admin only.
- `/setup settings [name] [emoji] [submitchannel] [formattingmsg] [addroleasreviewer] [removeroleasreviewer]`
    - name: Name of server
    - emoji: Emoji of server, used in titles, ex - `💜 Submission Claimed 💜`
    - submitchannel: The ID of the channel that listens to build submissions
    - formattingmsg: Link to a message that explains in which format a submission message must be in
    - addroleasreviewer: The ID of a role set to be marked as a reviewer
    - removeroleasreviewer: The ID of a role set to be unmarked/removed as a reviewer
- `/setup rank <level> [roleid] [points] [name]`
    - **level**: The level of the rank set to configure, from 1 to 5
    - roleid: The ID of the role, corresponding to this rank level
    - points: The minimum points needed for the level
    - name: The name of the level role

### 2. Review command
Review one or more submissions, for reviewers.

- `/review claim <submissionid>`
    - **submissionid**: The ID of the submission message
    > Note: Only the reviewer who claims the submission can review the build

The rest of the review sub commands share the following parameters `<submissionid> <feedback> [collaborators] [bonus] [edit]`:
- **submissionid**: The ID of the submission message
- **feedback**: The feedback to the submission, max 1700 chars
- collaborators: Number of collaborators
- bonus: Event and landmark bonuses (Event, Landmark, Both Event and Landmark, Focus, Both Focus and Landmark)
- edit: Marks if the review is an edit (edit, not edit)

**Rest of the review subcommands:**
- `/review one <size> <quality> <complexity>`
    - **size**: Building size (Small, Medium, Large, Monumental)
    - **quality**: Quality of build (Low, Medium, High)
    - **complexity**: Complexity of build (Simple, Moderate, Difficult)
- `/review many <smallamt> <mediumamt> <largeamt> <avgquality> <avgcomplexity>`
    - **smallamt**: Number of small buildings
    - **mediumamt**: Number of medium buildings
    - **largeamt**: Number of large buildings
    - **avgquality**: Avg build quality from 1-2
    - **avgcomplexity**: average complexity from 1-2
- `/review land <sqm> <quality> <landtype> <complexity>`
    - **sqm**: Land size in square meters
    - **quality**: Quality of land (Low, Medium, High)
    - **landtype**: Type of land (Tier 1, Tier 2, Tier 3)
    - **complexity**: Complexity of land (Simple, Moderate, Difficult)
- `/review road <roadtype> <distance> <quality> <complexity>`
    - **roadtype**: Type of road (Standard, Advanced)
    - **distance**: Road distance in kilometers
    - **quality**: Quality of road (Low, Medium, High)
    - **complexity**: Complexity of road (Simple, Moderate, Difficult)

### 3. Feedback command
Give feedback to a submission, for reviewers.
- `/feedback <submissionid> <feedback>`
    - **submissionid**: The ID of the submission message
    - **feedback**: Feedback for submission, max 1700 chars max

### 4. Decline command
Decline a submission with a feedback message, for reviewers.
- `/decline <submissionid> <feedback>`
    - **submissionid**: The ID of the submission message
    - **feedback**: Feedback for submission, max 1700 chars max

### 5. Purge command
Remove a submission that has already been accepted, for reviewers.
- `/purge <submissionid>`
    - **submissionid**: The ID of the submission message

### 6. Leaderboard command
View the leaderboard for the current server, or globally. Public.
- `leaderboard [global] [metric]`
    - global: Show SEBS leaderboard for all registered teams 
    - metric: What metric to rank people by (Points - **defualt**, Buildings, Roads, Land)

### 7. Server progress command
View building counts in the current server, public
- `/serverpogress [serverid]`
    - serverid: Server ID to get building counts from

### 8. Progress command
Views your rankup progress, public.
- `/progress [user]`
    - user: View someone else's rankup progress

### 9. Points command
View your points, public.
- `/points [user] [global]`
    - user: View someone else's points
    - global: View global SEBS points from all registered teams

### 10. See command
SEE the review summary of a submission, public.
- `/see <id>`
    - **id**: The ID of the submission message

### 11. Preferences command
Set user preferences, public.
- `/preferences [dm]`
    - **dm**: Enable/disable build review DMs (Default set to true)

## Installation
To install and use the bot, the first step is to clone the repository. Once cloned, you will need to choose how to host the bot, but first some prerequisites.
### Prerequisites
 - MongoDB Database:  The easies way is to use [MongoDB Atlas](https://www.mongodb.com/products/platform). Either way, once you create one, take note of your mongo url.
 - Discord Application (for the bot): Create one on [Discord Developer Portal](https://discord.com/developers/applications), where you need to take note of the bot `token` (Under the `Bot` section) and `client ID` (Under the `OAuth2` section). For further help, head to [Building your first Discord app](https://discord.com/developers/docs/quick-start/getting-started)
 - A Discord server, with a admin role, 5 roles for the 5 build ranks (take note of their ID's)

With these prerequisites noted, you must create the `config.ts` file, based on the sample in `configSample.ts` or bellow:

```ts
const config = {
    token: 'tokentokentokentokentokentokentokentokentokentoken',
    clientId: 'idididididididididid',
    mongoURI: 'mongodb://name:password@ip:ipPartTwo/databaseNAme',
    test: true,
    admin: 'idofadminrole'
}

export default config
```
 
### Hosting options
For hosting, you have two options.

- #### Option A - Direct code
Self host the the code directly on a server (with `npm` installed). Once the code and the config is on the server, type `npm install` into the console, and continue bellow.

- #### Option B - Docker image
Build a Docker image, push it to online private Docker repository and pull it to your server. The server and your PC must have `npm` and `docker` installed, and you must push or fork the repository to your GitHub repo.

Ex. you can use GitHub Container Registry (ghcr.io) as the Docker Registry:
1. Create a PAT (personal access token) as described [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and obtain it [here](https://github.com/settings/tokens).
2. Open the console on your PC.
3. Login to GHCR with:

`echo <PAT> | docker login ghcr.io --username GitHub-Username --password-stdin`
4. Build the Docker image:

`docker build . -t ghcr.io/github-username/repo-name:tag-name`
> Note: Make sure the link is **lowercase**
5. Push the Docker image:

`docker push ghcr.io/github-username/repo-name:tag-name`

<br>

> You can also setup a GitHub action to dynamically create the `config.ts` file, login into ghcr, build and push the Docker image every time you push a commit. This has be achieved by storing the config code and the PAT as a secret on your GitHub repository. Head to the `.github/ghcr.yml` file to view the example.

6. Head to your repo, open the package, click on `Package settings` and make sure the package is set to **Private**. Here you can also manage the access to the package, by giving, ex your server host GitHub account, read only access.
> Note: If you do give access to the package to someone else, they must create a PAT (personal access token) as well.

7. Now on your server, login into GHCR same way as before.
8. Pull the Docker image with:
 
 `docker pull ghcr.io/github-username/repo-name:tag-name`

<br>
 With these steps you can continue to the next step.

 ### Deploying the bot
 To deploy the bot, on your server you must first invite the bot to your Discord server: 
 1. Head to [Building your first Discord app](https://discord.com/developers/docs/quick-start/getting-started) and setup a `Guild Install` link (Use permissions that cover the intents mentioned under the **Permissions** section here)
 2. Open the link to invite your bot to the server
 3. To deploy the bot, run on your host server console: <br>
 `npm run deploy`
 4. To start the bot (don't start it yet), run:
 <br>
 `nmp run start` 
 > Note: Use this command for the startup command of the server

 ### Configuring the bot
 As the bot still offline, you must first insert a document into the MongoDB database (for now). Then most of the bot can can be configured with the `/setup` command (as shown under **Commands**), . Ex, if you use MongoDB Atlas you would:
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
4. Start the bot

From here on out you can see the **Commands** section, to further fully configure the bot via the `/setup` command

