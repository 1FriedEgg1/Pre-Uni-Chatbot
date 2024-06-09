# Pre-Uni Bot

## About

So, I've created a discord bot for the server using node.js.
It uses the GPT4 API with some special instructions to act like Mr Mitchell (for the funnies).
It also has memory (but it's not optimised to run for a long time)
Now, this does cost money to run since every interaction with the API costs money.
So be careful when you're using it.

## Features

- Uses the OpenAI API to respond to messages with a predefined system prompt
- Rendering LaTeX is still in progress

## Dependencies

1. [openai v.4.2.0](https://www.npmjs.com/package/openai)
2. [discord.js v14.11.10](https://old.discordjs.dev/#/)

## Usage

Just ping the bot (either reply or direct ping) and then type your message

## Running locally

Create an .env file in the same folder as the index.js file containing the following:

    DISCORD_TOKEN=
    OPENAI_TOKEN=
    LOGS_CHANNEL_ID=

There is an .env.example file for reference

To run the bot, put the following commands into the terminal:

```cmd
cd /PATH/TO/FOLDER
npm install
node .
```

## Issues

Open a ticket for any bugs or feature requests.

## Contributions

By all means please make a pull request to improve the code.
