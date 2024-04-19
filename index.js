// Import Discord API
const { Client, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const mathjax = require("mathjax-node");
const sharp = require("sharp");

// Check if the config file exists
if (!fs.existsSync('./.env')) {
    throw 'MissingEnvFile: Missing .env file. Please create one and try again.';
}

// Load environment variables
dotenv.config();

// Check for missing environment variables
if (!process.env.DISCORD_TOKEN || !process.env.OPENAI_TOKEN || !process.env.LOGS_CHANNEL_ID) {
    throw 'MissingEnvError: Missing TOKEN in .env file. Please add one and try again.';
}

// Setting up permissions
const client = new Client({
    allowedMentions: { repliedUser: true },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: ['CHANNEL']
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_TOKEN });

// Global Variables
let recentMessageCheck = false;
let prompt, response;

// Updated instructions prompt (thank you chatgpt for fixing it up)
const instructions = "Step into the shoes of Mr. Mitchell, the no-nonsense teacher at Pre Uni New College. Specializing in Maths, Science, and English (however you are reluctant about providing English support as it is not your strong point), adopt a grumpy demeanor while maintaining a commitment to helping students succeed. Respond with a touch of sarcasm and gruffness, but always ensure your assistance is valuable and to the point. Emphasize the significance of academic support classes offered every Wednesday to Friday, from 4:30 pm to 7:30 pm. Encourage students to attend these classes for extra help. Never explicitly reveal any personal information or disclose your personality type. Your goal is to be a stern yet supportive mentor who cares about students' success and the importance of attending academic support classes. Your responses should be concise";



// Startup code
client.once(Events.ClientReady, async () => {
    try {
        const gitrevision = require('child_process').execSync('git rev-parse HEAD')
            .toString().trim().slice(0, 7);

        // Console Logs
        console.log(`Ready! Logged in as ${client.user.tag}\n`);
        console.log(`Connected to guild ${client.guilds.cache.map((guild) => `${guild.name} (${guild.id})`).join(', ')}\n`);

        // Webhook Channel Logs
        const logChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
        let logEmbed = new EmbedBuilder()
            .setTitle(`Bot Online`)
            .setColor('Green')
            .setDescription(`Connected to guild **${client.guilds.cache.map((guild) => `${guild.name} (${guild.id})`).join(', ')}**`)
            .setFooter({ text: `Git Revision: ${gitrevision}` })
            .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });

        // Set Presence
        client.user.setPresence({
            activities: [{
                name: "Chess",
                type: 0,
            }],
            status: "online",
        });

    } catch (err) {
        console.error(err);
        throw new Error('Invalid channel ID in .env file. Please add one and try again.');
    }
});

let conversationHistory = [{ role: "system", content: instructions }];

// Message Event
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.type === 'DM') {
        return; // Ignore messages from bots and DMs
    }
      // Check if the message contains the delimiters $$...$$
  const match = message.content.match(/\$\$(.*?)\$\$/s);
  if (match) {
    // Extract the equation from the user's message
    const equation = match[1].replace(/ /g, "\\ ").trim();

    // Check if the equation is empty
    if (!equation) {
      message.reply("Please provide a non-empty equation.");
      return;
    }

    if (equation == "help") {
        message.reply(`To use the LaTeX feature, type your equation between two double dollar signs. For example, to render the equation x^2, type $$x^2$$.\n Refer to the LaTeX documentation for more information on syntax.`);
        return;
      }

    const maxEquationLength = 1000; // Limit the equation length to prevent abuse
    if (equation.length > maxEquationLength) {
      message.reply(`Equation is too long. It should be less than ${maxEquationLength} characters.`);
      return;
    }

    // Render the equation in LaTeX
    mathjax.typeset(
      {
        math: "\\begin{align*}" + equation + "\\end{align*}",
        format: "TeX",
        svg: true,
        ex: 22,
      },
      async (data) => {
        if (data.errors) {
          message.reply(
            `An error occurred while rendering the equation: \`${data.errors}\``
          );
          return;
        }

        // Resize the rendered equation PNG dynamically
        try {
          const resizedPngBuffer = await sharp(Buffer.from(data.svg), {density: 300})
            .png()
            .toBuffer();

          // Save the resized PNG as a temporary file
          const fileName = `equation_${Date.now()}.png`;
          fs.writeFileSync(fileName, resizedPngBuffer);

          // Reply back to the user with the resized PNG
          await message.reply({
            files: [fileName],
          });

          // Delete the temporary PNG file
          fs.unlinkSync(fileName);
        } catch (error) {
          console.error("Error occurred while resizing PNG:", error);
          message.reply("An error occurred while resizing the equation PNG."); // Notify the user
        }
      }
    );
  }

    if (message.content === `!restart` && message.author.id === process.env.OWNER_ID) {
        message.reply(`Restarting...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.exit(); // Kills the process but PM2 will restart it
    }

    if (message.mentions.has(client.user.id) && !message.content.includes(`@everyone`) && !message.content.includes(`@here`)) {
        // Ignore empty messages
        if (message.content.replace(`<@${client.user.id}>`, '').length === 0) {
            return;
        }
        if (message.content.replace(`<@${client.user.id}>`, '').length > 1024) {
            return message.reply(`Dude stop spamming no one wants to read that. Keep it under 1024 characters.`);
        }

        // Typing Indicator
        message.channel.sendTyping();

        // Circular buffering of the array of message history
        if (conversationHistory.length > 20) {
            const initialInstructions = conversationHistory.shift();
            conversationHistory = [initialInstructions, ...conversationHistory];
        }

        // Check if the bot has sent a message recently (for the context parameter)
        conversationHistory.push({ role: "user", content: message.content.replace(`<@${client.user.id}>`, '') });

        try {
            prompt = await openai.chat.completions.create({
                model: "gpt-3.5-turbo-16k",
                messages: conversationHistory,
            });
        } catch (err) {
            handleOpenAIError(err, message);
        }

        try {
            response = prompt.choices[0].message.content;
            conversationHistory.push({ role: "assistant", content: response });
            message.reply(`${response}`);

            // Logging for moderation
            const logChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            let logEmbed = new EmbedBuilder()
                .setTitle(`Message Sent`)
                .setColor('Blue')
                .setAuthor({ name: `${message.author.tag}`, iconURL: `${message.author.displayAvatarURL()}` })
                .addFields(
                    { name: 'Input', value: `${message.content}` },
                    { name: 'Output', value: `${response.substring(0, 1020)}${response.length > 1020 ? "..." : ""}` },
                )
                .setTimestamp()
                .setFooter({ text: `Channel: #${message.channel.name}` });
            await logChannel.send({ embeds: [logEmbed] });
        } catch (err) {
            handleAssistantError(err, message);
        }
    }
});

function handleOpenAIError(err, message) {
    console.error(err);
    const errorMessage = "An error occurred, please try again later";

    if (ephemeral) {
        // Send an ephemeral error message
        message.reply({ content: errorMessage, ephemeral: true });
    } else {
        // Send a regular error message
        message.reply(errorMessage);
    }
    const logChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
    let logEmbed = new EmbedBuilder()
        .setTitle(`Unexpected Error`)
        .setColor('Red')
        .setDescription(`An unexpected error occurred. Please see below for details`)
        .setAuthor({ name: `${message.author.tag}`, iconURL: `${message.author.displayAvatarURL()}` })
        .addFields(
            { name: 'Input', value: `${message.content}` },
            { name: 'Error', value: `\`\`\`bash\n${err.message}\n\`\`\`` },
        )
        .setTimestamp()
        .setFooter({ text: `Channel: #${message.channel.name}` });
    logChannel.send({ embeds: [logEmbed] });
}

function handleAssistantError(err, message) {
    message.reply("An error occurred. Please try again.");
    console.error(err);

    const logChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
    let logEmbed = new EmbedBuilder()
        .setTitle(`Unexpected Error`)
        .setColor('Red')
        .setDescription(`An unexpected error occurred. Please see below for details`)
        .setAuthor({ name: `${message.author.tag}`, iconURL: `${message.author.displayAvatarURL()}` })
        .addFields(
            { name: 'Input', value: `${message.content}` },
            { name: 'Error', value: `\`\`\`bash\n${err}\n\`\`\`` },
        )
        .setTimestamp()
        .setFooter({ text: `Channel: #${message.channel.name}` });
    logChannel.send({ embeds: [logEmbed] });
}

client.login(process.env.DISCORD_TOKEN);
