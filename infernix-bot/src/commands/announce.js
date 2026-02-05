const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement to a channel')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Announcement title')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Announcement message')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send announcement to (defaults to announcements channel)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Embed color')
        .setRequired(false)
        .addChoices(
          { name: '🔥 Fire Orange', value: '#F97316' },
          { name: '🔴 Red', value: '#EF4444' },
          { name: '🟢 Green', value: '#22C55E' },
          { name: '🔵 Blue', value: '#3B82F6' },
          { name: '🟡 Yellow', value: '#EAB308' },
          { name: '🟣 Purple', value: '#A855F7' },
        ))
    .addBooleanOption(option =>
      option.setName('ping')
        .setDescription('Ping @everyone?')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || 
                    interaction.guild.channels.cache.get(process.env.ANNOUNCEMENTS_CHANNEL_ID) ||
                    interaction.channel;
    const color = interaction.options.getString('color') || '#F97316';
    const ping = interaction.options.getBoolean('ping') || false;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setFooter({ text: `Announced by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    try {
      const content = ping ? '@everyone' : '';
      await channel.send({ content, embeds: [embed] });

      await interaction.reply({
        content: `✅ Announcement sent to ${channel}!`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Failed to send announcement:', error);
      await interaction.reply({
        content: '❌ Failed to send announcement. Check bot permissions!',
        ephemeral: true,
      });
    }
  },
};
