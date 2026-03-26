# SEBS Bot.

Welcome to the **South European Build System** bot, a bot for `BTE Team Balkans`. This bot was made based on the [NABS-BOT](https://github.com/BTE-Canada-USA/NASBS-BOT) with additional features and upgrades like `discord.js v14`) and use of a custom `paginator`.



## Permissions
The bot uses the following intents:
- Guilds (Access to guilds info)
- Guild members (Access to guild members info)
- Guild messages (Access to guild messages)
- Guild message reactions (Access to reactions in guild messages)
- Direct messages (Direct messaging to users)

## Features
The bot incorporates two systems, the trial/application part and the builder submissions/rank-up part.
### Trial system
The trial system enables user to become full-fledged builders using builder applications. Users apply to become a full builder via a fixed button, which includes a short survey.  
The survey includes a confirmation of a legal copy of Minecraft, how they rate themselves as builders, their Minecraft username, and which helper they want to handle their builder application. Once submitted the user is marked as a junior builder.

Each builder application is a private thread where the chosen helper gives task/'s to the junior builder for them to complete in an open timeframe. The tasks are chosen either randomly or selectively based on how the builder rated themselves initially.  
The junior builder is able to, in this time period, close their application, which marks the given task a free again and archives the thread. Once closed, they can reopen the application by applying to become a full builder again, where at that point, the builder application is treated as reopened. Once the helper reviews the completed tasks, they are either given more tasks or promoted to rank 1 (based on the Discord role associated with the rank) once they gater min 8 points.

When promoted, the application of the now full builder gets marked as closed, but the builder thread gets auto-archived after a week. This enables further help from the chosen helper, by simply tagging the helper in the private builder thread

> **Note**: Helpers must first be setup for them to be shown in the builder application survey. See '/setup helpersetup' under [commands](./docs/COMMANDS.md) to find out more

### Builder submissions system
This system enables builders to auto rank-up through rank 1 to 5 by submitting their builds. The builds once posted in the builder submissions channel are auto checked if they are in the correct format. If they are, they get re-posted by tge bot, and a reviewer must first claim the submitted build. This saves time that would else be spent among reviewers coordinating which submission will each reviewer review, as this process is a now a first comes, first serves basis.  
Once claimed, a 🔎 reaction is given to the submission message, and It's container get updated, marking it as under review. This also sends a direct message to the builder, notifying them of the update to the submission. Any further updates are also sent directly to the builder, which can be turned off per builder.

The reviewer can now either give feedback to the builder, decline the submission or rate it, which sets the submission as complete, marked by the ✅ reaction given to the submission message, update of the message container with the points breakdown, and a direct message sent to the builder notifying them of the score with the points breakdown and any **automatic rank-up**.

As submissions are reviewed, users can view their own or others submissions reviews individually either in the submission channel or via commands, see the global or team leaderboard, audit reviewers, see the reviewer's leaderboard, etc.

## Further info
For further info, ex. installation, see bellow: 

- [Commands](./docs/COMMANDS.md)
- [Installation](./docs/INSTALLATION.md)
- [Setup](./docs/SETUP.md)




 