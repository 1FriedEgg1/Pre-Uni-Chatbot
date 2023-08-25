# Pre-Uni Bot

## About
So, I've created a discord bot for the server using node.js.
It uses the GPT3.5-Turbo API with some special instructions to act like Mr Mitchell (for the funnies).
It also has memory (but it's not optimised to run for a long time)
Now, this does cost money to run since every interaction with the API costs money.
So be careful when you're using it.

## Dependencies
1. [openai v.4.2.0](https://www.npmjs.com/package/openai)
2. [discord.js v14.11.10](https://old.discordjs.dev/#/)

## Usage
Just ping the bot (either reply or direct ping) and then type your message

## Running locally
The code is commented and all that already.
But what you want to do is create a .env file in the same folder as the index.js file that contains some necessary variables

    DISCORD_TOKEN=
    OPENAI_TOKEN=
    LOGS_CHANNEL_ID=
There's already a .env.example file for reference

After that it's pretty streamlined.
Just open a command prompt and type the following:
	
    cd /PATH/TO/FOLDER
    npm install
    node .
Pretty easy right?
As long as you don't close the command prompt window it should run until it crashes or something.

## Issues
Just open a issue for any issues or special features that you want added.
There's no guarantee I'll add anything new or even fix the bot though.
## Contributions
By all means please make a pull request to improve the code.
