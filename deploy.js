const { exec } = require('child_process');
const { Client, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
const config = require('./config.json');
const util = require('util');
const execPromise = util.promisify(exec);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const commands = [
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Create a vouch')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to vouch for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('stars')
                .setDescription('Number of stars')
                .setRequired(true)
                .addChoices(
                    { name: '⭐', value: '1' },
                    { name: '⭐⭐', value: '2' },
                    { name: '⭐⭐⭐', value: '3' },
                    { name: '⭐⭐⭐⭐', value: '4' },
                    { name: '⭐⭐⭐⭐⭐', value: '5' },
                ))
        .addStringOption(option =>
            option.setName('vouch')
                .setDescription('Feedback')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('product')
                .setDescription('Product bought')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('attachment')
                .setDescription('Upload an image or video for further validation')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Get statistics about a user\'s vouches.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to get stats for')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display help menu.'),
];

const installDependencies = async () => {
    try {
        console.log('Installing required packages...\n');

        await execPromise('npm install');
        await execPromise('npm install center-align'); 

        console.log('All packages installed successfully.');
    } catch (error) {
        console.error('Error installing packages:', error);
        process.exit(1);
    }
};

const displayCenteredInfo = async () => {
    console.clear(); 

    const boxen = await import('boxen');
    const center = require('center-align');
    const botUser = client.user ? client.user.tag : 'Unknown Bot';
    const guildCount = client.guilds.cache.size || 0;

    const centeredText = `
    ${center(`Bot loaded as ${botUser}`, 50)}
    ${center(`Bot is in ${guildCount} server(s)`, 50)}
    ${center('Started refreshing application (/) commands.', 50)}
    ${center('Successfully reloaded application (/) commands.', 50)}
    `;

    const box = boxen.default(centeredText, {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'green',
        align: 'center',
    });

    console.log(box);
};

const deployCommands = async () => {
    const rest = new REST({ version: '9' }).setToken(config.botToken);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error deploying commands or running the bot:', error);
        process.exit(1);
    }
};

(async () => {
    await installDependencies();
    await deployCommands();

    client.once('ready', async () => {
        await displayCenteredInfo(); 
    });

    client.login(config.botToken);
})();
