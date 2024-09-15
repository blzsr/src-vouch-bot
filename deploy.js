const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
const config = require('./config.json');
const { exec } = require('child_process');

async function displayBox(message, color) {
    const boxen = (await import('boxen')).default;
    console.log(
        boxen(message, {
            padding: 1,
            borderStyle: 'round',
            borderColor: color,
            backgroundColor: 'black',
        })
    );
}

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

const rest = new REST({ version: '9' }).setToken(config.botToken);

(async () => {
    try {
        await displayBox('Started refreshing application (/) commands.', 'cyan');

        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        await displayBox('Successfully reloaded application (/) commands.', 'green');

        await client.login(config.botToken);
        const botUser = await client.users.fetch(config.clientId);

        const serverCount = (await client.guilds.fetch()).size;

        await displayBox(`
Bot Loaded As: ${botUser.username}
Connected To ${serverCount} Servers
        `, 'magenta');

        exec('node main.js', (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing main.js: ${err}`);
                return;
            }
            if (stdout) console.log(`Output: ${stdout}`);
            if (stderr) console.error(`Error: ${stderr}`);
        });
    } catch (error) {
        await displayBox(`Error: ${error.message}`, 'red');
    }
})();
