# Installation
To install and use the bot, the first step is to clone the repository. Once cloned, you will need to choose how to host the bot, but first some prerequisites.
## Prerequisites
 - MongoDB Database:  The easies way is to use [MongoDB Atlas](https://www.mongodb.com/products/platform). Either way, once you create one, take note of your mongo url.
 - Discord Application (for the bot): Create one on [Discord Developer Portal](https://discord.com/developers/applications), where you need to take note of the bot `token` (Under the `Bot` section) and `client ID` (Under the `OAuth2` section). For further help, head to [Building your first Discord app](https://discord.com/developers/docs/quick-start/getting-started)
 - A Discord server, with an admin role, 5 roles for the 5 build ranks, min 1 reviewer role and min 1 helper role

With these prerequisites noted, you must create the `config.ts` file, based on the sample in `configSample.ts` or bellow:

```ts
const config = {
    token: 'tokentokentokentokentokentokentokentokentokentoken',
    clientId: 'idididididididididid',
    mongoURI: 'mongodb://name:password@ip:ipPartTwo/databaseNAme',
    test: false, //Note - if true, the Discord server on which the now test bot will be used on, It's ID must be different from `discordServerID` bellow
    admin: 'id-of-admin-role'
    discordServerID: 'id-of-discord-server'
}

export default config
```
 
## Hosting options
For hosting, you have two options.

###  A. Direct code
Self host the the code directly on a server (with `npm` installed). Once the code and the config is on the server, type `npm install` into the console (of your server), and continue bellow to the **Deploying the bot** section.
### B. Docker image
Build a Docker image, push it to online private Docker repository and pull it to your server. The server and your PC must have `npm` and `docker` installed, and you must push or fork the repository to your GitHub repo. Before you continue, make sure to install the dependencies with the command `npm install` (Navigate to the clone folder of the repository in the console)

Ex. you can use `GitHub Container Registry (ghcr.io)` as the Docker Registry:
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

 ## Deploying the bot
 To deploy the bot, on your server you must first invite the bot to your Discord server: 
 1. Head to [Building your first Discord app](https://discord.com/developers/docs/quick-start/getting-started) and setup a `Guild Install` link (use permissions that cover the intents mentioned under the **Permissions** section here)
 2. Open the link to invite your bot to the server
 3. To deploy the bot, run on your host server console:  
 `npm run deploy`
 4. To start the bot, run:  
 `nmp run start`  
> Note: Use this command for the startup command of the server