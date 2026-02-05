const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(0xF97316)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Bot Latency', value: `${latency}ms`, inline: true },
        { name: '💓 API Latency', value: `${apiLatency}ms`, inline: true },
      )
      .setFooter({ text: 'Infernix Bot' })
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
