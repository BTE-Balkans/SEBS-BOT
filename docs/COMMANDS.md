# Commands
The bot offers 15 commands, with more to come in the future. Some are public, some are for reviewers only and some are admin only.
> Note: Parameters marked with `[]` are optional, as opposed to ones marked with `<>`

## 1. Setup command
Setup the bot for the server, admin only.
- `/setup settings [name] [emoji] [submitchannel] [formattingmsg] [accentColor] [addroleasreviewer] [removeroleasreviewer]`
    - name: Name of server
    - emoji: Emoji of server, used in titles, ex - `💜 Submission Claimed 💜`
    - submitchannel: The ID of the channel that listens for build submissions
    - plotschannel: The ID of the channel that listens for plots for builders
    - formattingmsg: Link to a message that explains in which format a submission message must be in
    - accentColor: The color to use in embeds, containers, etc. in HEX format, ex. `#ac707e`
    - addroleasreviewer: The ID of a role set to be marked as a reviewer
    - removeroleasreviewer: The ID of a role set to be unmarked/removed as a reviewer
- `/setup applicationformatmsg [visitservermsg] [welcomeimg] [guidelink]`  
    - visitservermsg: The Markdown text shown in the welcome msg, on how to visit the build server
    - welcomeimg: Link to an image shown in the welcome msg
    - guidelink: Link to the build guide for the junior builder
- `/setup rank <level> [roleid] [points] [name]`
    - **level**: The level of the rank set to configure, from 1 to 5
    - roleid: The ID of the role, corresponding to this rank level
    - points: The minimum points needed for the level
    - name: The name of the level role
- `/setup setuphelper` - Adds and setups user as helper
    - **user**: The user to set up as a helper (User must have at min one helper role)
- `/setup helperstatus` - Mark helper as inactive or active
    - **user** - The helper to change their status of
    - **inactive** - True if inactive, false if active
    > **Note**: If inactive, the helper doesn't show up in the builder application survey
- `/setup openapplicationmessage` - Post the open builder application message to the channel
- `/setup formattingmsg [optionaltext]` - Make or update the existing formatting message in the channel
    - optionaltext: Optional text to be inserted at the end as a new paragraph
- `/setup info` - View current server setup info
## 2. Review command
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
    - metric: What metric to rank people by (Points - **default**, Buildings, Roads, Land)

### 7. Server progress command
View building counts in the current server, public
- `/serverpogress <serverid>`
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
- `/preferences dm <enabled>`
    - **enabled**: Enable/disable build review DMs (Default set to true)
- `/preferences mcusername <username>`
    - **username**: Minecraft username

### 12. Task command
Manage the junior builder plots. **Must be run inside the builder thread channel.**
- `/task assign <plotid>` - Assign a plot to the junior builder
    - **plots**: ID of the message to the plot
    > Note, a plot can be assigned to the builder via the `Assign` button under the plot message as well
- `/task revoke <plotid>` - Revoke task from junior builder
    - **plotid**: ID of the message to the plot

### 13. Plot command
Manage the plots. **The following can be done by using the action buttons bellow the plot message as well.**
- `/plot edit <plotid> [address] [coords] [difficulty] [maplink]` - Edit an open, unassigned plot
    - **plotid**: ID of the message to the plot
    - **address**: Address of plot
    - **coords**: Geographic coordinates of the plot
    - **difficulty**: Difficulty of the plot (Novice, Beginner, Competent, Proficient, Expert)
    - **maplink**: Location map link
- `/plot delete <plotid>` - Delete an open, unassigned plot
    - **plotid**: ID of the message to the plot
### 14. Accept command
Accept a member as a builder, for helpers only.
- `/accept [user] [mcusername]` - When run without the optional 2 options, it can only be run within a builder thread to promote the junior builder to a full builder. Else when the both of the two optional are specified, it can only be run outside the prior thread, to accept a non-candidate as a full builder
    - **user**: The user to accept
    - **mcusername**: A valid Minecraft username of the user
### 15. Submission command
Enable builders to edit submissions before they are claimed for review
- `/submission edit<submissionindex> [address] [coordinates] [buildcount]` - Edit a submission's address, coordinates or build count
  - **submissionindex**: The index of the submission (#<number> on the submission message)
  - **address**: The new address of the submission
  - **coordinates**: The new coordinates of the build
  - **buildcount**: The new build count
- `/submission collaborators <submissionindex> [add] [remove]` - Add or remove collaborators in the same format as in the submission message (discordtags mcusernames count)
    - **submissionindex**: The index of the submission (#<number> on the submission message)
    - **add**: Collaborators to add
    - **remove**: Collaborators to remove
