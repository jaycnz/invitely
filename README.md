# Invitely

A Discord bot for sending personal, "letter"-style game invites. Invite people to a
gaming session; they get a sealed DM they have to open, you're notified the moment
they do, and a live lobby embed in your server fills up as people confirm.

## How it works

1. Host runs `/invite create` with a game, time, slot count, and mentions of who to invite.
2. Each invitee gets a DM with a sealed "letter" — just an **Open Letter** button, no
   details yet.
3. When they click it, the host gets a DM: *"X opened your invite letter."* The letter
   then reveals the game/time and shows **I'm in** / **Can't make it** buttons.
4. Confirming or declining updates a live lobby embed posted in the channel the invite
   was created in, and DMs the host their answer.
5. The lobby marks itself full once slots run out and stops accepting more confirms.

Invite data is stored per-invite in `data/invites.json`, so it survives bot restarts.
It is **not** committed to git (see `.gitignore`) — each running instance has its own
local copy.

## Project structure

```
commands/
  invite.js         → the /invite create slash command
  ping.js            → test command, confirms the deploy pipeline works
handlers/
  inviteInteractions.js  → handles Open/Confirm/Decline button clicks
utils/
  inviteStore.js     → JSON-file persistence for invites
  embeds.js          → builds the teaser/revealed/lobby embeds
  components.js       → builds the button rows
index.js              → bot entry point, loads commands, wires up interactionCreate
deploy-commands.js    → registers slash commands with Discord (run after adding/changing commands)
```

## Local setup

Each contributor runs their **own** Discord bot application for local development —
don't share tokens. The code is identical for everyone; only your `.env` is personal.

### 1. Clone and install

```
git clone https://github.com/jaycnz/invitely.git
cd invitely
npm install
```

### 2. Create your own dev bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) →
   **New Application** → name it something like `invitely-dev-yourname`.
2. **Bot** tab → **Reset Token** → copy it (you'll only see it once).
3. Under **Bot** tab, make sure these are enabled if you don't see them checked:
   - `Server Members Intent`
   - `Message Content Intent`
4. **General Information** tab → copy the **Application ID**.
5. **OAuth2 → URL Generator** → check `bot` and `applications.commands` scopes, and
   under bot permissions check `Send Messages`, `Embed Links`, `Use Slash Commands`.
   Copy the generated URL and open it to invite your dev bot to a test server (can be
   a private server you make just for testing).
6. In that same test server, enable **Developer Mode** (User Settings → Advanced),
   right-click the server icon → **Copy Server ID**.

### 3. Set up your .env

Create a `.env` file in the project root (this is gitignored, never commit it):

```
DISCORD_TOKEN=your_dev_bot_token
APPLICATION_ID=your_dev_bot_application_id
GUILD_ID=your_test_server_id
```

### 4. Deploy commands and run

```
node deploy-commands.js
node index.js
```

Your dev bot should log in and show online in your test server. Try `/ping` first to
confirm the pipeline works, then `/invite create`.

## Notes for anyone extending this

- Slash command **options** (name, description, required args) only take effect after
  re-running `node deploy-commands.js` — restarting the bot alone isn't enough.
- Time input to `/invite create` is parsed loosely (`YYYY-MM-DD HH:mm` or full ISO with
  offset). For anything timezone-sensitive, ISO with an explicit offset
  (`2026-09-20T19:00:00+13:00`) is the reliable option.
- Not yet built: invite expiry/auto-decline after a time window, and profile photos in
  the lobby/letter embeds (planned, intentionally out of MVP scope for now).
