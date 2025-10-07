const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play = require('play-dl');
const ytdlp = require('youtube-dl-exec');
const { spawn } = require('child_process');
const path = require('path');

// Set up cookies for YouTube (create cookies.txt file first)
const fs = require('fs');
if (fs.existsSync('./cookies.txt')) {
    console.log('🍪 Setting up YouTube cookies...');
    play.setToken({
        youtube: {
            cookie: fs.readFileSync('./cookies.txt', 'utf-8')
        }
    });
    console.log('✅ YouTube cookies configured');
}
const YouTube = require('youtube-sr').default;
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = process.env.PREFIX || '!';
const TOKEN = process.env.DISCORD_TOKEN;

// Queue system - Maps guild ID to queue data
const queues = new Map();

if (!TOKEN) {
    console.error('❌ No Discord token found! Please check your .env file.');
    process.exit(1);
}

client.once('ready', () => {
    console.log(`✅ Bot is online and logged in as ${client.user.tag}`);
    console.log(`🎵 Ready to play music in ${client.guilds.cache.size} servers`);
});

// Initialize queue for a guild
function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            songs: [],
            connection: null,
            player: null,
            textChannel: null,
            isPlaying: false,
            volume: 0.5
        });
    }
    return queues.get(guildId);
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            case 'join':
                await handleJoinCommand(message);
                break;
            case 'leave':
                await handleLeaveCommand(message);
                break;
            case 'play':
            case 'p':
                await handlePlayCommand(message, args);
                break;
            case 'queue':
            case 'q':
                await handleQueueCommand(message);
                break;
            case 'skip':
            case 's':
                await handleSkipCommand(message);
                break;
            case 'stop':
                await handleStopCommand(message);
                break;
            case 'clear':
                await handleClearCommand(message);
                break;
            case 'pause':
                await handlePauseCommand(message);
                break;
            case 'resume':
                await handleResumeCommand(message);
                break;
            case 'search':
                await handleSearchCommand(message, args);
                break;
            case 'help':
                await handleHelpCommand(message);
                break;
            default:
                message.channel.send(`❓ Unknown command. Use \`${PREFIX}help\` to see available commands.`);
        }
    } catch (error) {
        console.error('Command error:', error);
        message.channel.send('❌ An error occurred while processing your command.');
    }
});

async function handleJoinCommand(message) {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel to use this command!');
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
        return message.channel.send('❌ I need permission to connect and speak in your voice channel!');
    }

    try {
        const queue = getQueue(message.guild.id);

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });

        queue.connection = connection;

        // Add connection status monitoring
        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log('Voice connection is ready');
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log('Voice connection disconnected');
            try {
                await connection.reconnect();
            } catch {
                console.log('Failed to reconnect, destroying connection');
                connection.destroy();
                queue.connection = null;
            }
        });

        connection.on('error', (error) => {
            console.error('Voice connection error:', error);
        });

        message.channel.send(`🎤 Successfully joined **${voiceChannel.name}**!`);
    } catch (error) {
        console.error('Join error:', error);
        message.channel.send('❌ Failed to join the voice channel.');
    }
}

async function handleLeaveCommand(message) {
    const connection = getVoiceConnection(message.guild.id);

    if (!connection) {
        return message.channel.send('❌ I am not connected to any voice channel.');
    }

    connection.destroy();
    message.channel.send('👋 Successfully left the voice channel.');
}

async function handlePlayCommand(message, args) {
    console.log(`🎵 Play command received: ${args.join(' ')}`);

    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel to play music!');
    }

    const query = args.join(' ');
    if (!query) {
        return message.channel.send('❌ Please provide a YouTube URL or search term!');
    }

    console.log(`🔍 Processing query: "${query}"`);
    const queue = getQueue(message.guild.id);

    try {
        message.channel.send('⏳ Searching for your song...');
        console.log('📤 Sent searching message');

        let songUrl = query;
        let songInfo;

        console.log(`🔗 Initial songUrl: "${songUrl}"`);

        // Check if input is a valid YouTube URL
        const validationResult = play.yt_validate(query);
        console.log(`🔍 URL validation result: "${validationResult}"`);

        if (validationResult === 'video') {
            console.log('✅ Valid YouTube URL detected');
            console.log('📡 Getting video info from play-dl...');
            songInfo = await play.video_info(query);
            songUrl = query; // Ensure songUrl is explicitly set to query
            console.log('✅ Video info retrieved successfully');
        } else {
            console.log('🔍 Not a URL, searching YouTube...');
            // Search YouTube for the query
            const searchResults = await play.search(query, { limit: 1, source: { youtube: 'video' } });
            console.log(`🔍 Search completed, found ${searchResults?.length || 0} results`);
            console.log(`🔍 Search results structure:`, JSON.stringify(searchResults, null, 2));

            if (!searchResults || searchResults.length === 0) {
                console.log('❌ No search results found');
                return message.channel.send('❌ No search results found for your query.');
            }

            const firstResult = searchResults[0];
            console.log(`🔍 First result structure:`, JSON.stringify(firstResult, null, 2));
            songUrl = firstResult.url;
            console.log(`🎯 Using first result: ${songUrl}`);

            // Get detailed info from play-dl
            console.log('📡 Getting detailed video info from play-dl...');
            songInfo = await play.video_info(songUrl);
            console.log('✅ Detailed video info retrieved successfully');
        }

        console.log('🎵 Creating song object...');
        console.log(`🔗 Final songUrl before song creation: "${songUrl}"`);
        console.log(`🔗 songUrl type: ${typeof songUrl}`);
        console.log('🔍 Video info returned:', songInfo.video_details.title);
        console.log('🔍 Video URL being used:', songUrl);

        const song = {
            title: songInfo.video_details.title,
            url: songUrl || query, // Fallback to query if songUrl is undefined
            duration: songInfo.video_details.durationInSec,
            thumbnail: songInfo.video_details.thumbnails[0]?.url,
            requester: message.author,
            addedAt: Date.now(),
            videoInfo: songInfo // Store the complete video info for streaming
        };

        console.log(`🎵 Song created: "${song.title}" (${formatDuration(song.duration)})`);
        console.log(`🔗 Song object URL: "${song.url}"`);
        queue.songs.push(song);
        queue.textChannel = message.channel;
        console.log(`📝 Added to queue. Queue length: ${queue.songs.length}`);

        const embed = {
            color: 0x00ff00,
            title: '🎵 Added to Queue',
            description: `**[${song.title}](${song.url})**`,
            fields: [
                {
                    name: 'Duration',
                    value: formatDuration(song.duration),
                    inline: true
                },
                {
                    name: 'Position in Queue',
                    value: `${queue.songs.length}`,
                    inline: true
                },
                {
                    name: 'Requested by',
                    value: song.requester.username,
                    inline: true
                }
            ],
            thumbnail: {
                url: song.thumbnail
            },
            timestamp: new Date()
        };

        console.log('📤 Sending queue embed...');
        message.channel.send({ embeds: [embed] });
        console.log('✅ Queue embed sent successfully');

        if (!queue.isPlaying) {
            console.log('▶️ Starting playback (queue was not playing)...');
            await playNextSong(queue, message);
        } else {
            console.log('📜 Added to queue (already playing)');
        }

    } catch (error) {
        console.error('❌ Play command error - Full details:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        message.channel.send('❌ Failed to load the song. Please check your input and try again.');
    }
}

// Utility function to format duration in seconds to MM:SS
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Play the next song in queue
async function playNextSong(queue, message) {
    if (queue.songs.length === 0) {
        queue.isPlaying = false;
        queue.textChannel?.send('📭 Queue is empty. Add more songs with `!play <url>`');
        return;
    }

    const song = queue.songs[0];

    try {
        if (!queue.connection) {
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel) {
                queue.songs = [];
                return message.channel.send('❌ You left the voice channel! Queue cleared.');
            }

            queue.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false,
            });
        }

        console.log('🎵 Creating audio stream with youtube-dl-exec...');
        console.log('🎵 Using yt-dlp binary for reliable YouTube streaming...');

        console.log('🎵 Spawning yt-dlp process directly...');

        // Construct path to bundled yt-dlp binary
        const ytdlpBinary = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
        console.log('🔍 Using yt-dlp binary:', ytdlpBinary);

        // Check if binary exists
        if (!fs.existsSync(ytdlpBinary)) {
            throw new Error(`yt-dlp binary not found at: ${ytdlpBinary}`);
        }

        // Prepare yt-dlp arguments with better headers and authentication
        const ytdlpArgs = [
            '--output', '-',
            '--format', 'ba[ext=webm]/ba[ext=m4a]/ba/worst',
            '--quiet',
            '--no-warnings',
            '--no-playlist',
            '--extractor-args', 'youtube:player_client=android,web',
            '--user-agent', 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
            '--referer', 'https://www.youtube.com/',
            song.url
        ];

        // Add cookies if available
        const cookieFiles = ['/Users/one/Desktop/cookies.firefox-private.txt', './cookies.txt'];
        for (const cookieFile of cookieFiles) {
            if (fs.existsSync(cookieFile)) {
                console.log(`🍪 Using cookies from: ${cookieFile}`);
                ytdlpArgs.splice(-1, 0, '--cookies', cookieFile);
                break;
            }
        }

        const ytdlpProcess = spawn('/opt/homebrew/bin/python3.12', [ytdlpBinary, ...ytdlpArgs], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        console.log('🎵 yt-dlp process spawned, PID:', ytdlpProcess.pid);
        console.log('🎵 Building audio resource from stdout...');

        const resource = createAudioResource(ytdlpProcess.stdout, {
            inputType: 'arbitrary'
        });

        // Handle process errors
        ytdlpProcess.on('error', (error) => {
            console.error('❌ yt-dlp process error:', error);
        });

        ytdlpProcess.stderr.on('data', (data) => {
            console.error('❌ yt-dlp stderr:', data.toString());
        });
        console.log('✅ Audio resource created successfully');

        if (!queue.player) {
            queue.player = createAudioPlayer();
            queue.connection.subscribe(queue.player);

            queue.player.on(AudioPlayerStatus.Playing, () => {
                console.log('▶️ Audio player started PLAYING');
                console.log('🔍 Current song in queue:', queue.songs[0]?.title);
                console.log('🔍 Queue length:', queue.songs.length);
                queue.isPlaying = true;
                const embed = {
                    color: 0x00ff00,
                    title: '▶️ Now Playing',
                    description: `**[${queue.songs[0].title}](${queue.songs[0].url})**`,
                    fields: [
                        {
                            name: 'Duration',
                            value: formatDuration(queue.songs[0].duration),
                            inline: true
                        },
                        {
                            name: 'Requested by',
                            value: queue.songs[0].requester.username,
                            inline: true
                        }
                    ],
                    thumbnail: {
                        url: queue.songs[0].thumbnail
                    },
                    timestamp: new Date()
                };
                queue.textChannel?.send({ embeds: [embed] });
            });

            queue.player.on(AudioPlayerStatus.Idle, () => {
                console.log('🔄 Audio player went IDLE - song finished or failed');
                console.log(`📝 Songs in queue before removal: ${queue.songs.length}`);
                queue.songs.shift(); // Remove finished song
                console.log(`📝 Songs remaining after removal: ${queue.songs.length}`);
                playNextSong(queue, message);
            });

            queue.player.on('error', (error) => {
                console.error('Player error:', error);
                queue.textChannel?.send('❌ An error occurred during playback.');
                queue.songs.shift();
                playNextSong(queue, message);
            });
        }

        queue.player.play(resource);

    } catch (error) {
        console.error('Playback error:', error);
        queue.textChannel?.send('❌ Failed to play the current song. Skipping...');
        queue.songs.shift();
        playNextSong(queue, message);
    }
}

async function handleQueueCommand(message) {
    const queue = getQueue(message.guild.id);

    if (queue.songs.length === 0) {
        return message.channel.send('📭 The queue is currently empty.');
    }

    const queueList = queue.songs.slice(0, 10).map((song, index) => {
        return `${index + 1}. **[${song.title}](${song.url})** - ${formatDuration(song.duration)} | *${song.requester.username}*`;
    }).join('\n');

    const embed = {
        color: 0x0099ff,
        title: '🎵 Music Queue',
        description: queueList,
        fields: [
            {
                name: 'Total Songs',
                value: `${queue.songs.length}`,
                inline: true
            }
        ],
        timestamp: new Date()
    };

    if (queue.songs.length > 10) {
        embed.footer = { text: `... and ${queue.songs.length - 10} more songs` };
    }

    message.channel.send({ embeds: [embed] });
}

async function handleSkipCommand(message) {
    const queue = getQueue(message.guild.id);

    if (!queue.isPlaying) {
        return message.channel.send('❌ Nothing is currently playing.');
    }

    if (queue.songs.length <= 1) {
        return message.channel.send('❌ No more songs in the queue to skip to.');
    }

    queue.player.stop();
    message.channel.send('⏭️ Skipped the current song.');
}

async function handleStopCommand(message) {
    const queue = getQueue(message.guild.id);

    if (!queue.isPlaying) {
        return message.channel.send('❌ Nothing is currently playing.');
    }

    queue.songs = [];
    queue.player.stop();
    queue.isPlaying = false;
    message.channel.send('⏹️ Stopped playing and cleared the queue.');
}

async function handleClearCommand(message) {
    const queue = getQueue(message.guild.id);

    if (queue.songs.length === 0) {
        return message.channel.send('📭 The queue is already empty.');
    }

    const clearedCount = queue.songs.length;
    queue.songs = [];
    message.channel.send(`🗑️ Cleared ${clearedCount} songs from the queue.`);
}

async function handlePauseCommand(message) {
    const queue = getQueue(message.guild.id);

    if (!queue.isPlaying || !queue.player) {
        return message.channel.send('❌ Nothing is currently playing.');
    }

    queue.player.pause();
    message.channel.send('⏸️ Paused the current song.');
}

async function handleResumeCommand(message) {
    const queue = getQueue(message.guild.id);

    if (!queue.player) {
        return message.channel.send('❌ Nothing is currently playing.');
    }

    queue.player.unpause();
    message.channel.send('▶️ Resumed the current song.');
}

async function handleSearchCommand(message, args) {
    const query = args.join(' ');
    if (!query) {
        return message.channel.send('❌ Please provide a search term!');
    }

    try {
        message.channel.send('🔍 Searching YouTube...');

        const searchResults = await YouTube.search(query, { limit: 5, type: 'video' });

        if (!searchResults || searchResults.length === 0) {
            return message.channel.send('❌ No search results found for your query.');
        }

        const resultsList = searchResults.map((video, index) => {
            const duration = video.duration || 'Unknown';
            return `${index + 1}. **[${video.title}](${video.url})** - \`${duration}\``;
        }).join('\n');

        const embed = {
            color: 0x0099ff,
            title: `🔍 Search Results for "${query}"`,
            description: resultsList,
            footer: {
                text: `Use ${PREFIX}play <number> or ${PREFIX}play <url> to add a song to the queue`
            },
            timestamp: new Date()
        };

        message.channel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Search error:', error);
        message.channel.send('❌ An error occurred while searching.');
    }
}

async function handleHelpCommand(message) {
    const helpEmbed = {
        color: 0x0099ff,
        title: '🎵 Discord DJ Bot Commands',
        description: `Use prefix \`${PREFIX}\` before commands`,
        fields: [
            {
                name: `${PREFIX}join`,
                value: 'Join your current voice channel',
                inline: true
            },
            {
                name: `${PREFIX}play <url/search>`,
                value: 'Add a song to the queue from URL or search',
                inline: true
            },
            {
                name: `${PREFIX}search <term>`,
                value: 'Search YouTube and show results',
                inline: true
            },
            {
                name: `${PREFIX}queue`,
                value: 'Show the current music queue',
                inline: true
            },
            {
                name: `${PREFIX}skip`,
                value: 'Skip the current song',
                inline: true
            },
            {
                name: `${PREFIX}stop`,
                value: 'Stop playing and clear queue',
                inline: true
            },
            {
                name: `${PREFIX}pause`,
                value: 'Pause the current song',
                inline: true
            },
            {
                name: `${PREFIX}resume`,
                value: 'Resume the paused song',
                inline: true
            },
            {
                name: `${PREFIX}clear`,
                value: 'Clear the music queue',
                inline: true
            },
            {
                name: `${PREFIX}leave`,
                value: 'Leave the current voice channel',
                inline: true
            },
            {
                name: `${PREFIX}help`,
                value: 'Show this help message',
                inline: true
            }
        ],
        timestamp: new Date(),
        footer: {
            text: 'Discord DJ Bot v2.0'
        }
    };

    message.channel.send({ embeds: [helpEmbed] });
}

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

client.login(TOKEN);