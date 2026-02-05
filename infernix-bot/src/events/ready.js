const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log('');
    console.log('🔥 ═══════════════════════════════════════════ 🔥');
    console.log('   INFERNIX BOT ONLINE');
    console.log(`   Logged in as: ${client.user.tag}`);
    console.log(`   Serving: ${client.guilds.cache.size} server(s)`);
    console.log(`   Commands: ${client.commands.size} loaded`);
    console.log('🔥 ═══════════════════════════════════════════ 🔥');
    console.log('');

    // Set bot status
    client.user.setPresence({
      activities: [{ name: '🔥 Infernix Executor', type: 3 }], // Type 3 = Watching
      status: 'online',
    });
  },
};
