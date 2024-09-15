const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const rest = new REST({ version: '9' }).setToken(config.botToken);

const getStarEmojis = (count) => '⭐️'.repeat(count);

const vouchCommand = new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Create a vouch')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('User to vouch for')
            .setRequired(true),
    )
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
            ),
    )
    .addStringOption(option =>
        option.setName('vouch')
            .setDescription('Feedback')
            .setRequired(true),
    )
    .addStringOption(option =>
        option.setName('product')
            .setDescription('Product bought')
            .setRequired(true),
    )
    .addAttachmentOption(option =>
        option.setName('attachment')
            .setDescription('Upload an image or video for further validation')
            .setRequired(false),
    );

const vouchLoadCommand = new SlashCommandBuilder()
    .setName('vouchload')
    .setDescription('Load vouches');

const statsCommand = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Get statistics about a user\'s vouches.')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('User to get stats for')
            .setRequired(false),
    );

const helpCommand = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with bot commands');

const commands = [vouchCommand, vouchLoadCommand, statsCommand, helpCommand];

class HelpDropdown {
    constructor(bot) {
        this.bot = bot;
    }

    createSelectMenu() {
        return new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Choose a command category')
            .addOptions(
                {
                    label: '👑 - Owner',
                    description: 'Owner only commands',
                    value: 'owner',
                },
                {
                    label: '📥 - Vouches',
                    description: 'Vouch-related commands',
                    value: 'vouch',
                },
                {
                    label: '📊 - Stats',
                    description: 'Statistics commands',
                    value: 'stats',
                },
            );
    }

    async handleSelection(interaction) {
        let description;

        switch (interaction.values[0]) {
            case 'owner':
                description = `\`/vouchload\`: Load vouches\n`;
                break;
            case 'vouch':
                description = `\`/vouch\`: Create a vouch\n\`/stats\`: Get vouch statistics\n`;
                break;
            case 'stats':
                description = `\`/stats\`: Get statistics about a user's vouches\n`;
                break;
            default:
                description = 'No commands found for this category.';
                break;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.values[0].toUpperCase()} Commands`)
            .setDescription(description)
            .setColor('#00FF00');

        await interaction.update({ embeds: [embed] });
    }
}

client.on('ready', async () => {
    const { user, guilds } = client;
    const serverCount = guilds.cache.size;

    console.log(`
${'='.repeat(50)}
| Bot Loaded As: ${user.username.padEnd(25)} |
| Connected To ${serverCount} Servers       |
${'='.repeat(50)}
    `);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = interaction.commandName;

    if (command === 'vouch') {
        const stars = parseInt(interaction.options.getString('stars'));
        const feedback = interaction.options.getString('vouch');
        const product = interaction.options.getString('product');
        const userToVouch = interaction.options.getUser('user');
        const user = interaction.user;
        const attachment = interaction.options.getAttachment('attachment');

        const vouch = `${userToVouch.username} - ${stars} stars - ${feedback} - ${product}\n`;

        try {
            fs.appendFileSync(config.vouchesFile, vouch);
        } catch (error) {
            console.error('Failed to save vouch:', error);
            return interaction.reply({ content: 'An error occurred while saving your vouch.', ephemeral: true });
        }

        const starEmojis = getStarEmojis(stars);

        const vouchEmbed = new EmbedBuilder()
            .setTitle(`Vouch from ${user.username} for ${userToVouch.username}`)
            .setDescription(feedback)
            .addFields(
                { name: 'Rating', value: starEmojis, inline: true },
                { name: 'Product Bought', value: product, inline: true },
            )
            .setThumbnail(userToVouch.displayAvatarURL())
            .setColor('#00FF00')
            .setFooter({ text: 'Thank you for your vouch!' });

        if (attachment) {
            const attachmentUrl = attachment.url;
            vouchEmbed.setImage(attachmentUrl);
        }

        await interaction.reply({ embeds: [vouchEmbed] });
    }

    if (command === 'vouchload') {
        try {
            const vouches = fs.readFileSync(config.vouchesFile, 'utf8');
            const vouchArray = vouches.trim().split('\n');
            const embeds = [];

            vouchArray.forEach(vouch => {
                if (vouch) {
                    const [username, stars, feedback, product] = vouch.split(' - ');
                    const starEmojis = getStarEmojis(parseInt(stars));

                    const embed = new EmbedBuilder()
                        .setTitle(`Vouch for ${username}`)
                        .setDescription(feedback)
                        .addFields(
                            { name: 'Rating', value: starEmojis, inline: true },
                            { name: 'Product Bought', value: product, inline: true },
                        )
                        .setColor('#00FF00');

                    embeds.push(embed);
                }
            });

            if (embeds.length > 0) {
                await interaction.reply({ embeds: embeds });
            } else {
                await interaction.reply({ content: 'No vouches found.', ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to load vouches:', error);
            await interaction.reply({ content: 'An error occurred while loading the vouches.', ephemeral: true });
        }
    }

    if (command === 'stats') {
        const userToCheck = interaction.options.getUser('user') || interaction.user;

        try {
            const vouches = fs.readFileSync(config.vouchesFile, 'utf8');
            const vouchArray = vouches.trim().split('\n');
            const starCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
            let totalVouches = 0;

            vouchArray.forEach(vouch => {
                if (vouch.startsWith(userToCheck.username)) {
                    const parts = vouch.split(' - ');
                    const stars = parts[1]?.split(' ')[0];

                    if (stars) {
                        starCounts[stars]++;
                        totalVouches++;
                    }
                }
            });

            const statsEmbed = new EmbedBuilder()
                .setTitle(`Vouch Statistics for ${userToCheck.username}`)
                .addFields(
                    { name: 'Total Vouches', value: totalVouches.toString(), inline: true },
                    { name: '⭐', value: starCounts['1'].toString(), inline: true },
                    { name: '⭐⭐', value: starCounts['2'].toString(), inline: true },
                    { name: '⭐⭐⭐', value: starCounts['3'].toString(), inline: true },
                    { name: '⭐⭐⭐⭐', value: starCounts['4'].toString(), inline: true },
                    { name: '⭐⭐⭐⭐⭐', value: starCounts['5'].toString(), inline: true },
                )
                .setThumbnail(userToCheck.displayAvatarURL())
                .setColor('#00FF00');

            await interaction.reply({ embeds: [statsEmbed] });
        } catch (error) {
            console.error('Failed to generate stats:', error);
            await interaction.reply({ content: 'An error occurred while generating the statistics.', ephemeral: true });
        }
    }

    if (command === 'help') {
        const helpDropdown = new HelpDropdown(client);
        const row = new ActionRowBuilder().addComponents(helpDropdown.createSelectMenu());

        const helpEmbed = new EmbedBuilder()
            .setTitle('Help Menu')
            .setDescription('Choose a category to see available commands.')
            .setColor('#00FF00');

        await interaction.reply({ embeds: [helpEmbed], components: [row] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;

    const helpDropdown = new HelpDropdown(client);
    await helpDropdown.handleSelection(interaction);
});

client.login(config.botToken);
