# 🔥 Infernix Discord Bot

A Discord bot for the Infernix Executor community.

## Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it "Infernix"
3. Go to the **Bot** section
4. Click "Add Bot"
5. Copy the **Token** (keep this secret!)
6. Enable these Privileged Gateway Intents:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent

### 2. Invite the Bot to Your Server

1. Go to **OAuth2** → **URL Generator**
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

### 3. Configure the Bot

1. Copy `.env.example` to `.env`
2. Add your bot token and server ID:

```
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=your_server_id_here
```

To get your Server ID: Enable Developer Mode in Discord settings, then right-click your server and click "Copy Server ID".

### 4. Install & Run

```bash
npm install
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `/info` | Get information about Infernix |
| `/download` | Get the download link |
| `/status` | Check executor status |
| `/changelog` | View the latest changelog |
| `/help` | List all commands |

## Features

- 🔥 Fire-themed embeds
- 📥 Download information
- 📊 Status updates
- 👋 Welcome messages for new members
- ⚡ Slash commands
