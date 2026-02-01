import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActivityType } from 'discord.js';
import { readFileSync } from 'fs';

// Load environment variables manually (or use dotenv)
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get information about Infernix'),
  
  new SlashCommandBuilder()
    .setName('download')
    .setDescription('Get the download link for Infernix'),
  
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check Infernix executor status'),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),
  
  new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('View the latest changelog'),
].map(command => command.toJSON());

// Register commands when bot is ready
client.once('ready', async () => {
  console.log(`🔥 Infernix Bot is online as ${client.user.tag}`);
  
  // Set bot status
  client.user.setActivity('over Infernix', { type: ActivityType.Watching });
  
  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // Info command
  if (commandName === 'info') {
    const embed = new EmbedBuilder()
      .setColor(0xFF6B35)
      .setTitle('🔥 Infernix Executor')
      .setDescription('The next-generation Roblox executor. Powerful, secure, and incredibly fast.')
      .addFields(
        { name: '⚡ Lightning Fast', value: 'Execute scripts with blazing speed', inline: true },
        { name: '🛡️ Secure', value: 'Your scripts stay protected', inline: true },
        { name: '👥 Multi-Client', value: 'Attach to multiple clients', inline: true },
        { name: '📚 Script Hub', value: 'Access thousands of scripts', inline: true },
        { name: '🎨 Modern UI', value: 'Beautiful Monaco editor', inline: true },
        { name: '🔄 Auto Updates', value: 'Always stay up to date', inline: true },
      )
      .setFooter({ text: 'Infernix • Experience the future of script execution' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Download command
  if (commandName === 'download') {
    const embed = new EmbedBuilder()
      .setColor(0xFF6B35)
      .setTitle('📥 Download Infernix')
      .setDescription('Get the latest version of Infernix Executor!')
      .addFields(
        { name: '🔗 Website', value: '[infernix.dev](https://infernix.dev/download)' },
        { name: '📦 Version', value: 'v1.0.0 (Latest)', inline: true },
        { name: '💻 Platform', value: 'Windows 10/11', inline: true },
      )
      .setFooter({ text: 'Free forever • Auto updates included' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Status command
  if (commandName === 'status') {
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📊 Infernix Status')
      .addFields(
        { name: '🟢 Executor', value: 'Operational', inline: true },
        { name: '🟢 Script Hub', value: 'Operational', inline: true },
        { name: '🟢 Updates', value: 'Available', inline: true },
      )
      .setDescription('All systems are running smoothly!')
      .setFooter({ text: 'Last checked' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Help command
  if (commandName === 'help') {
    const embed = new EmbedBuilder()
      .setColor(0xFF6B35)
      .setTitle('🔥 Infernix Bot Commands')
      .setDescription('Here are all available commands:')
      .addFields(
        { name: '/info', value: 'Get information about Infernix' },
        { name: '/download', value: 'Get the download link' },
        { name: '/status', value: 'Check executor status' },
        { name: '/changelog', value: 'View the latest changelog' },
        { name: '/help', value: 'Show this help message' },
      )
      .setFooter({ text: 'Infernix Bot • Need help? Ask in #support' });

    await interaction.reply({ embeds: [embed] });
  }

  // Changelog command
  if (commandName === 'changelog') {
    const embed = new EmbedBuilder()
      .setColor(0xFF6B35)
      .setTitle('📋 Changelog - v1.0.0')
      .setDescription('**February 2026 - Initial Release**')
      .addFields(
        { name: '✨ New Features', value: 
          '• Initial public release\n' +
          '• Monaco editor integration\n' +
          '• Multi-client support\n' +
          '• Script hub with popular scripts\n' +
          '• Modern dark theme UI'
        },
      )
      .setFooter({ text: 'Infernix • Stay updated!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
});

// Welcome new members
client.on('guildMemberAdd', async (member) => {
  const welcomeChannel = member.guild.channels.cache.find(
    ch => ch.name === 'welcome' || ch.name === 'general'
  );
  
  if (welcomeChannel) {
    const embed = new EmbedBuilder()
      .setColor(0xFF6B35)
      .setTitle('🔥 Welcome to Infernix!')
      .setDescription(`Hey ${member}! Welcome to the Infernix community!\n\nMake sure to check out our channels and grab the executor from #download!`)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `Member #${member.guild.memberCount}` })
      .setTimestamp();

    welcomeChannel.send({ embeds: [embed] });
  }
});

// Login
if (!TOKEN) {
  console.error('❌ No DISCORD_TOKEN found! Create a .env file with your bot token.');
  console.log('1. Go to https://discord.com/developers/applications');
  console.log('2. Create a new application');
  console.log('3. Go to Bot section and create a bot');
  console.log('4. Copy the token and add it to .env file');
  process.exit(1);
}

client.login(TOKEN);
