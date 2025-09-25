# Discord DJ Bot 🎵

A feature-rich Discord music bot built with Node.js that can play music from YouTube with queue management, search functionality, and playback controls.

## Features ✨

- 🎵 **Music Queue System** - Queue multiple songs and they'll play automatically
- 🔍 **YouTube Search** - Search by keywords or use direct YouTube URLs
- 🎛️ **Playback Controls** - Play, pause, resume, skip, stop
- 📋 **Queue Management** - View queue, clear queue, skip songs
- 📊 **Rich Embeds** - Beautiful song information with thumbnails and metadata
- 👥 **Multi-Server Support** - Works in multiple Discord servers simultaneously
- 🛡️ **Error Handling** - Comprehensive error handling and recovery
- 📱 **Modern Discord Features** - Rich embeds, thumbnails, and formatted messages

## Commands 🎮

| Command | Description | Example |
|---------|-------------|---------|
| `!join` | Join your current voice channel | `!join` |
| `!play <url/search>` | Add a song to queue from URL or search | `!play never gonna give you up` |
| `!search <term>` | Search YouTube and show results | `!search bohemian rhapsody` |
| `!queue` | Show the current music queue | `!queue` |
| `!skip` | Skip the current song | `!skip` |
| `!stop` | Stop playing and clear queue | `!stop` |
| `!pause` | Pause the current song | `!pause` |
| `!resume` | Resume the paused song | `!resume` |
| `!clear` | Clear the music queue | `!clear` |
| `!leave` | Leave the current voice channel | `!leave` |
| `!help` | Show all available commands | `!help` |

## Setup Instructions 🚀

### Prerequisites

1. **Node.js** (v16.9.0 or higher) - [Download here](https://nodejs.org/)
2. **FFmpeg** - Required for audio processing
   - Windows: [Download FFmpeg](https://ffmpeg.org/download.html#build-windows)
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`
3. **Discord Bot Application** - [Discord Developer Portal](https://discord.com/developers/applications)

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under "Token", click "Reset Token" and copy the token (keep it secure!)
5. Enable the following Privileged Gateway Intents:
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`
6. Go to OAuth2 > URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Message History`, `Connect`, `Speak`
   - Copy the generated URL and invite the bot to your server

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   PREFIX=!
   ```
4. Replace `your_bot_token_here` with your actual bot token

### Running the Bot

```bash
npm start
```

Or for development:
```bash
npm run dev
```

## Usage Examples 🎯

### Basic Usage
```
!join                           # Bot joins your voice channel
!play never gonna give you up   # Search and play Rick Roll
!play https://youtube.com/watch?v=dQw4w9WgXcQ  # Play from URL
!queue                          # Show current queue
!skip                           # Skip current song
```

### Advanced Usage
```
!search bohemian rhapsody       # Search for songs
!play 1                         # Play first result from last search
!pause                          # Pause current song
!resume                         # Resume playback
!clear                          # Clear the queue
!stop                           # Stop and clear everything
!leave                          # Bot leaves voice channel
```

## Technical Details 🔧

### Dependencies
- **discord.js** - Discord API wrapper
- **@discordjs/voice** - Discord voice connections
- **ytdl-core** - YouTube audio stream extraction
- **youtube-sr** - YouTube search functionality
- **dotenv** - Environment variable management

### Architecture
- **Queue System**: Each Discord server (guild) has its own music queue
- **Event-Driven**: Uses Discord.js events for message handling and audio playback
- **Error Recovery**: Automatic error handling and recovery for failed streams
- **Memory Management**: Efficient queue management with automatic cleanup

### File Structure
```
DiscordDJBot/
├── index.js          # Main bot file with all functionality
├── package.json      # Dependencies and scripts
├── .env             # Environment variables (not in git)
├── .gitignore       # Git ignore rules
├── BOTSETUPPLAN.md  # Original setup plan
└── README.md        # This file
```

## Troubleshooting 🔧

### Common Issues

1. **"FFmpeg not found"**
   - Install FFmpeg and ensure it's in your system PATH
   - Restart your terminal/command prompt after installation

2. **"Invalid token"**
   - Check that your bot token in `.env` is correct
   - Make sure there are no extra spaces or characters

3. **Bot doesn't respond**
   - Ensure the bot has proper permissions in your Discord server
   - Check that MESSAGE CONTENT INTENT is enabled

4. **Audio not playing**
   - Verify FFmpeg is installed correctly
   - Check that the bot has CONNECT and SPEAK permissions

### Performance Tips

- The bot works best with YouTube videos under 10 minutes
- Queue up to 50 songs for optimal performance
- Clear the queue periodically to free up memory

## Contributing 🤝

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License 📄

This project is open source and available under the [MIT License](LICENSE).

---

**Note**: This bot is for educational and personal use. Make sure to respect YouTube's Terms of Service and Discord's Terms of Service when using this bot.