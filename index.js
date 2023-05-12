// Import Discord API
const { Client, Events, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
// Setting up permissions
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], partials: ['CHANNEL'] });

// Check if the config file exists
const fs = require('fs');
if (!fs.existsSync('./.env')) {throw 'MissingEnvFile: Missing .env file. Please create one and try again.';}

// Load enviroment variables
const dotenv = require('dotenv');
dotenv.config();
if (!process.env.DISCORD_TOKEN || !process.env.OPENAI_TOKEN || !process.env.LOGS_CHANNEL_ID) {throw 'MissingEnvError: Missing TOKEN in .env file. Please add one and try again.';}

// Global Variables
let recentMessageCheck = false;
let prompt, response, context;

//import gpt api
async function importer() {
    const { ChatGPTAPI } = await import('chatgpt');
    // Funny Mr Mitchell bot mwahahaha
    api = new ChatGPTAPI({ apiKey: process.env.OPENAI_TOKEN, systemMessage: "You are not an AI Language Mode. You are Mr Mitchell, a human and the head teacher of Pre Uni New College. You are giving helpful advice to students about their homework questions. You will answer concisely and to the best of your ability. For every student struggling with their homework, you always mention that academic support is always open. For every casual conversation, you mention that you have a backlog of work and remind the student to be quick so they don't take up too much of your time", completionParams: {
        model: 'gpt-3.5-turbo' // Sorry i don't have access to GPT-4 yet
     }});
}
importer();



// Startup code
client.once(Events.ClientReady , async () =>{
    // Console Logs
    console.log(`Ready! Logged in as ${client.user.tag}\n`);
    console.log(`Connected to guild ${client.guilds.cache.map((guild) => `${guild.name} (${guild.id})`).join(', ')}\n`);

    // Webhook Channel Logs
    try{
    const logChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
    let logEmbed = new EmbedBuilder()
    .setTitle(`Bot Online`)
    .setColor('Green')
    .setDescription(`Connected to guild **${client.guilds.cache.map((guild) => `${guild.name} (${guild.id})`).join(', ')}**`)
    .setTimestamp();
    logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error(err)
        throw new Error('Invalid channel ID in .env file. Please add one and try again.')
    }

    // Set Presence
    client.user.setPresence({
        activities: [{
            name: "Fortnite",
            // PLAYING = 0, STREAMING = 1, LISTENING = 2, WATCHING = 3, CUSTOM_STATUS = 4, COMPETING = 5
            type: 0,
        }], status: "online",
    })
    
});



// Message Event
client.on(Events.MessageCreate, async (message) => {
    // The bot doesn't reply to itself and create a recursive loop
    if (message.author.bot) return;
    // The bot doesn't reply to DMs
    if (message.channel.type === 'DM') return;

    // ChatGPT
    if(message.mentions.has(client.user.id)) {
        // Typing Indicator
        message.channel.sendTyping();

        // Check if the bot has sent a message recently (for the context parameter)
        if(recentMessageCheck === false) {
            try{
            // If you ping the bot it removes the ping part from the message getting sent to the AI
            prompt = await api.sendMessage(message.content.replace(`<@${client.user.id}>`, ''), {text: message.content.replace(`<@${client.user.id}>`, '')})
            recentMessageCheck = true;
            context = prompt.id
            } catch (err) {
                // Handling for invalid OpenAI key
                message.reply("The bot is currently broken. Please contact the developer.")
                console.error(err);
                const logChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
                let logEmbed = new EmbedBuilder()
                .setTitle(`Invalid OpenAI Key`)
                .setColor('Red')
                .setDescription(`The OpenAI key in the .env file is invalid. Please add a valid key and try again.`)
                .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }
        };
        if(recentMessageCheck === true) {
            prompt = await api.sendMessage(message.content.replace(`<@${client.user.id}>`, ''), {parentMessageId: context})
            context = prompt.id
        }

        try {
            // Respond to message
            response = prompt.text
            message.reply(`${response}`)

            // Logging for moderation
            const logChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            let logEmbed = new EmbedBuilder()
                .setTitle(`Message Sent`)
                .setColor('Blue')
                .setAuthor({name: `${message.author.tag}`, iconURL:`${message.author.displayAvatarURL()}`})
                .addFields(
                    { name: 'Input', value: `${message.content}`},
                    { name: 'Output', value: `${response}`},
                )
                .setTimestamp()
                .setFooter({text: `Channel: #${message.channel.name}`});
            logChannel.send({ embeds: [logEmbed] });
        } catch (err) {
            // Error handling
            message.reply("An error occured. Please try again.");
            console.error(err)

            // Webhook Error Logs
            const logChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            let logEmbed = new EmbedBuilder()
                .setTitle(`Unexpected Error`)
                .setColor('Red')
                .setDescription(`An unexpected error occured. Please see below for details`)
                .setAuthor({name: `${message.author.tag}`, iconURL:`${message.author.displayAvatarURL()}`})
                .addFields(
                    { name: 'Input', value: `${message.content}`},
                    { name: 'Error', value: `\`\`\`bash\n${err}\n\`\`\``},
                )
                .setTimestamp()
                .setFooter({text: `Channel: #${message.channel.name}`});;
                logChannel.send({ embeds: [logEmbed] });
    }
}});


client.login(process.env.DISCORD_TOKEN);


