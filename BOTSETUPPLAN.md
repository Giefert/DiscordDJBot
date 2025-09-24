# How to Build a Discord Music Bot with Node.js

This guide provides a complete walkthrough for creating a personal Discord music bot using Node.js. The bot will be able to join voice channels and stream audio from YouTube links. This is an excellent project for learning about APIs, Node.js streams, and managing asynchronous operations.

## ► I. Prerequisites

Before you start, make sure you have the following installed and ready:

* **A Discord Account:** Necessary for creating the bot application via the Developer Portal.
* **A Code Editor:** [Visual Studio Code](https://code.visualstudio.com/) is a highly recommended free option.
* **Node.js:** You must have Node.js installed. You can download it from the [official Node.js website](https://nodejs.org/en/download/).
* **FFmpeg:** This is a **critical dependency**. FFmpeg is a multimedia framework that processes audio for streaming. Your bot will not function without it. You must install it and ensure its location is in your system's PATH environment variable.
* **Basic JavaScript Knowledge:** You should be comfortable with JavaScript syntax, functions, and asynchronous concepts like Promises.

---

## ► II. Step-by-Step Guide

### Step 1: Create the Discord Application

First, you need to register your application with Discord.

1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Click **"New Application"** and give it a unique name (e.g., "NodeJS Jukebox").
3.  Navigate to the **"Bot"** tab on the left menu.
4.  Click **"Add Bot"** and confirm the action.
5.  Click the **"Reset Token"** button to reveal your bot's token.
    * **⚠️ Security Warning:** This token is your bot's password. **Never share it** or upload it to public places like GitHub.
6.  Scroll down and enable the **Privileged Gateway Intents**:
    * `SERVER MEMBERS INTENT`
    * `MESSAGE CONTENT INTENT`

### Step 2: Set Up Your Node.js Project

Now, let's set up the project folder and install the necessary libraries.

1.  Open your terminal or command prompt and create a new project directory:
    ```bash
    mkdir nodejs-music-bot
    cd nodejs-music-bot
    ```
2.  Initialize a `package.json` file:
    ```bash
    npm init -y
    ```
3.  Install the required npm packages:
    * `discord.js`: The main library for interacting with the Discord API.
    * `@discordjs/voice`: The official add-on for handling voice connections and audio playbook.
    * `yt-dlp-exec`: A Node.js wrapper for `yt-dlp` to fetch audio streams from YouTube.
    * `dotenv`: A utility to load your secret token from a `.env` file.

    Run this command to install them all:
    ```bash
    npm install discord.js @discordjs/voice yt-dlp-exec dotenv
    ```

### Step 3: Write the Basic Bot Code

1.  Create a file named `index.js` in your project folder. This will be your main bot file.
2.  Create another file named `.env`. This file will store your secret token.
3.  In your `.env` file, add the following line, replacing `YOUR_SECRET_TOKEN` with the token you got from the Developer Portal:
    ```
    DISCORD_TOKEN=YOUR_SECRET_TOKEN
    ```
4.  In your `index.js` file, add the following code to get your bot online:
    ```javascript
    // Require necessary libraries
    const { Client, GatewayIntentBits } = require('discord.js');
    require('dotenv').config(); // Load environment variables from .env file

    // Create a new client instance with necessary intents
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates, // Required for voice state updates
            GatewayIntentBits.MessageContent
        ]
    });

    const token = process.env.DISCORD_TOKEN;

    // When the client is ready, run this code (only once)
    client.once('ready', () => {
        console.log(`✅ Bot is online and logged in as ${client.user.tag}`);
    });

    // Login to Discord with your client's token
    client.login(token);
    ```
5.  Run your bot from the terminal using `node index.js`. If everything is correct, you'll see the "Bot is online" message.

### Step 4: Invite The Bot to Your Server

1.  Go back to the Discord Developer Portal and select your application.
2.  Navigate to **"OAuth2" -> "URL Generator"**.
3.  Select the following scopes: `bot` and `applications.commands`.
4.  In the "Bot Permissions" section that appears, check these boxes:
    * `Send Messages`
    * `Read Message History`
    * `Connect` (to join voice channels)
    * `Speak` (to play audio)
5.  Copy the generated URL, paste it into your web browser, and follow the prompts to add the bot to your server.

### Step 5: Implement Music Commands

Now, let's add the logic to handle commands like `!join`, `!play`, and `!leave`. You would add this code inside your `index.js` file.

Here is a conceptual outline of the logic:

```javascript
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const ytdlp = require('yt-dlp-exec');

client.on('messageCreate', async message => {
    // Ignore messages from bots and messages without the prefix
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'join') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.channel.send('You need to be in a voice channel to use this command!');
        }
        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        message.channel.send(`Joined **${voiceChannel.name}**!`);
    }

    if (command === 'play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.channel.send('You need to be in a voice channel to play music!');
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const url = args[0];
        if (!url) return message.channel.send("Please provide a YouTube URL!");

        try {
            // Get audio stream from YouTube
            const stream = ytdlp.exec(url, {
                o: '-',
                q: '',
                f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
                r: '100K',
            }, { stdio: ['ignore', 'pipe', 'ignore'] });

            const resource = createAudioResource(stream.stdout);
            const player = createAudioPlayer();

            connection.subscribe(player);
            player.play(resource);

            message.channel.send('▶️ Now playing your song!');

        } catch (error) {
            console.error(error);
            message.channel.send('There was an error playing the song.');
        }
    }

    if (command === 'leave') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.channel.send('Successfully left the voice channel.');
        } else {
            message.channel.send('I am not in a voice channel.');
        }
    }
});