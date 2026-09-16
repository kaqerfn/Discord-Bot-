// ==========================================================
// Kaqer Community Bot
// Discord.js v14
// FULL SERVER RESET + REPAIR
// ==========================================================

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  ActivityType,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ==========================================================
// TOKEN
// ==========================================================

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN is missing from Railway Variables.");
  process.exit(1);
}

// ==========================================================
// CLIENT
// ==========================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ==========================================================
// STYLE
// ==========================================================

const CHANNEL_PREFIX = ">ᴗ<・";
const CATEGORY_PREFIX = "౨ৎ・";

// ==========================================================
// ROLE NAMES
// ==========================================================

const ROLE_NAMES = [
  "owner",
  "co-owner",
  "admin",
  "moderator",
  "staff",
  "support",

  "member",
  "bots",

  "she/her",
  "he/him",
  "they/them",
  "any pronouns",

  "adult",
  "minor",

  "artist",
  "music",
  "anime",

  "introvert",
  "extrovert",

  "announcements",
  "events",
  "giveaways",
  "polls",

  "level 5",
  "level 10",
  "level 20",
  "level 30",
  "level 50",
];

// ==========================================================
// ROLE COLORS
// ==========================================================

const ROLE_COLORS = {
  owner: 0xff69b4,
  "co-owner": 0xff8acb,
  admin: 0xff4d6dff,
  moderator: 0x8f7cff,
  staff: 0xb28cff,
  support: 0x7ed6df,

  member: 0xffffff,
  bots: 0x95a5a6,

  "she/her": 0xff8fb1,
  "he/him": 0x7da7ff,
  "they/them": 0xb794f4,
  "any pronouns": 0x77dd77,

  adult: 0xffc857,
  minor: 0xff9f43,

  artist: 0xff7eb6,
  music: 0x9b8cff,
  anime: 0xff8a80,

  introvert: 0x8da9c4,
  extrovert: 0xffa07a,

  announcements: 0xffc857,
  events: 0x7ed6df,
  giveaways: 0xff8fb1,
  polls: 0xb794f4,

  "level 5": 0xffd166,
  "level 10": 0xffb4e1ff,
  "level 20": 0xd6a4ff,
  "level 30": 0xff7f66,
  "level 50": 0xff69b4,
};

// ==========================================================
// LEVEL DATA
// ==========================================================

const dataFolder = path.join(__dirname, "data");
const levelsFile = path.join(dataFolder, "levels.json");

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

if (!fs.existsSync(levelsFile)) {
  fs.writeFileSync(levelsFile, "{}");
}

let levels = {};

try {
  levels = JSON.parse(fs.readFileSync(levelsFile, "utf8"));
} catch {
  levels = {};
}

function saveLevels() {
  fs.writeFileSync(
    levelsFile,
    JSON.stringify(levels, null, 2)
  );
}

// ==========================================================
// LEVEL CALCULATION
// ==========================================================

function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

function xpForLevel(level) {
  return level * level * 100;
}

// ==========================================================
// SERVER STRUCTURE
// ==========================================================

const STRUCTURE = {
  info: [
    "rules",
    "announcements",
    "welcome",
    "goodbye",
    "introductions",
    "boosts",
    "partnerships",
    "self-roles",
  ],

  community: [
    "chat",
    "make-friends",
    "media",
    "memes",
  ],

  extras: [
    "levels",
    "starboard",
    "confessions",
    "support",
  ],

  voice: [
    "VC",
  ],

  staff: [
    "staff-chat",
    "moderation",
    "staff-lounge",
    "staff-vc",
  ],
};

// ==========================================================
// CREATE ROLE
// ==========================================================

async function createRole(guild, name) {
  let role = guild.roles.cache.find(
    (r) => r.name === name
  );

  if (role) return role;

  return await guild.roles.create({
    name,
    color: ROLE_COLORS[name] || 0x5865f2,
    reason: "Kaqer server repair",
  });
}

// ==========================================================
// DELETE ROLES
// ==========================================================

async function deleteAllRoles(guild) {
  console.log("🗑️ Deleting removable roles...");

  const roles = [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id)
    .sort((a, b) => b.position - a.position);

  for (const role of roles) {
    try {
      if (role.managed) {
        console.log(
          `⏭️ Skipping managed role: ${role.name}`
        );
        continue;
      }

      await role.delete(
        "Full Kaqer server repair"
      );

      console.log(`🗑️ Deleted role: ${role.name}`);
    } catch (error) {
      console.log(
        `⚠️ Could not delete role ${role.name}: ${error.message}`
      );
    }
  }

  console.log("✅ Roles cleaned.");
}

// ==========================================================
// DELETE CHANNELS
// ==========================================================

async function deleteAllChannels(guild) {
  console.log("🗑️ Deleting all channels...");

  const channels = [...guild.channels.cache.values()];

  for (const channel of channels) {
    try {
      await channel.delete(
        "Full Kaqer server repair"
      );

      console.log(
        `🗑️ Deleted channel: ${channel.name}`
      );
    } catch (error) {
      console.log(
        `⚠️ Could not delete ${channel.name}: ${error.message}`
      );
    }
  }

  console.log("✅ Channels cleaned.");
}

// ==========================================================
// CREATE ALL ROLES
// ==========================================================

async function createAllRoles(guild) {
  const roles = {};

  for (const name of ROLE_NAMES) {
    roles[name] = await createRole(guild, name);
  }

  return roles;
}

// ==========================================================
// STAFF PERMISSIONS
// ==========================================================

function staffPermissions(guild, roles) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
      ],
    },

    ...[
      "owner",
      "co-owner",
      "admin",
      "moderator",
      "staff",
      "support",
    ].map((name) => ({
      id: roles[name].id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ],
    })),
  ];
}

// ==========================================================
// CREATE CATEGORY
// ==========================================================

async function createCategory(
  guild,
  name,
  roles,
  staffOnly = false
) {
  const options = {
    name: `${CATEGORY_PREFIX}${name}`,
    type: ChannelType.GuildCategory,
  };

  if (staffOnly) {
    options.permissionOverwrites =
      staffPermissions(guild, roles);
  }

  return await guild.channels.create(options);
}

// ==========================================================
// CREATE TEXT CHANNEL
// ==========================================================

async function createText(
  guild,
  category,
  name,
  permissionOverwrites = []
) {
  return await guild.channels.create({
    name: `${CHANNEL_PREFIX}${name}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
  });
}

// ==========================================================
// CREATE VOICE CHANNEL
// ==========================================================

async function createVoice(
  guild,
  category,
  name,
  permissionOverwrites = []
) {
  return await guild.channels.create({
    name: `${CHANNEL_PREFIX}${name}`,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites,
  });
}

// ==========================================================
// SEND RULES
// ==========================================================

async function sendRules(channel) {
  const embed = new EmbedBuilder()
    .setTitle("౨ৎ・rules")
    .setDescription(
      [
        "**1. Respect everyone**",
        "Treat members and staff respectfully.",
        "",
        "**2. No harassment**",
        "Do not bully, threaten, or target other members.",
        "",
        "**3. No spam**",
        "Avoid message spam, ping spam, or channel flooding.",
        "",
        "**4. Keep things appropriate**",
        "No NSFW or inappropriate content.",
        "",
        "**5. No discrimination**",
        "Hate speech and discriminatory behavior are not allowed.",
        "",
        "**6. No unauthorized advertising**",
        "Do not advertise without permission.",
        "",
        "**7. Follow staff instructions**",
        "Staff may moderate situations when necessary.",
        "",
        "**8. Have fun**",
        "Meet people, chat, and enjoy the community. >ᴗ<",
      ].join("\n")
    )
    .setFooter({
      text: "Please follow the rules >ᴗ<",
    });

  await channel.send({
    embeds: [embed],
  });
}

// ==========================================================
// SEND WELCOME
// ==========================================================

async function sendWelcome(channel) {
  const embed = new EmbedBuilder()
    .setTitle("౨ৎ・welcome")
    .setDescription(
      "welcome to the community >ᴗ<\n\nread the rules, choose your roles, and come hang out!"
    );

  await channel.send({
    embeds: [embed],
  });
}

// ==========================================================
// SEND LEVELS
// ==========================================================

async function sendLevels(channel) {
  const embed = new EmbedBuilder()
    .setTitle("౨ৎ・levels")
    .setDescription(
      [
        "Chat to earn XP and level up!",
        "",
        "level 5 → level 5",
        "level 10 → level 10",
        "level 20 → level 20",
        "level 30 → level 30",
        "level 50 → level 50",
        "",
        "Use `/rank` to view your level.",
      ].join("\n")
    );

  await channel.send({
    embeds: [embed],
  });
}

// ==========================================================
// SELF ROLES
// ==========================================================

async function sendSelfRoles(channel, roles) {
  const embed = new EmbedBuilder()
    .setTitle("౨ৎ・self roles")
    .setDescription(
      [
        "**pronouns**",
        "❤️ she/her",
        "💙 he/him",
        "🖤 they/them",
        "💚 any pronouns",
        "",
        "**age**",
        "🧑 adult",
        "🔞 minor",
        "",
        "**interests**",
        "🎨 artist",
        "🎹 music",
        "🌝 anime",
        "",
        "**personality**",
        "👤 introvert",
        "🫂 extrovert",
        "",
        "**notifications**",
        "📣 announcements",
        "🎫 events",
        "🫡 giveaways",
        "🐻‍❄️ polls",
      ].join("\n")
    )
    .setFooter({
      text: "choose your roles >ᴗ<",
    });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("role_sheher")
      .setLabel("❤️ she/her")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_hehim")
      .setLabel("💙 he/him")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_theythem")
      .setLabel("🖤 they/them")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_any")
      .setLabel("💚 any pronouns")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("role_adult")
      .setLabel("🧑 adult")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_minor")
      .setLabel("🔞 minor")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_artist")
      .setLabel("🎨 artist")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_music")
      .setLabel("🎹 music")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("role_anime")
      .setLabel("🌝 anime")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_introvert")
      .setLabel("👤 introvert")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_extrovert")
      .setLabel("🫂 extrovert")
      .setStyle(ButtonStyle.Secondary)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("role_announcements")
      .setLabel("📣 announcements")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_events")
      .setLabel("🎫 events")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_giveaways")
      .setLabel("🫡 giveaways")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("role_polls")
      .setLabel("🐻‍❄️ polls")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    embeds: [embed],
    components: [
      row1,
      row2,
      row3,
      row4,
    ],
  });
}

// ==========================================================
// CONFESSION PANEL
// ==========================================================

async function sendConfessionPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("౨ৎ・anonymous confessions")
    .setDescription(
      "have something to say?\n\nsend it anonymously with the button below. >ᴗ<"
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confess_button")
      .setLabel("💭 make a confession")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// ==========================================================
// TICKET PANEL
// ==========================================================

async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("౨ৎ・support")
    .setDescription(
      "need help with something?\n\ncreate a private ticket and the staff team will help you."
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("create_ticket")
      .setLabel("🎫 create ticket")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// ==========================================================
// MOD APPLICATION PANEL
// ==========================================================

async function sendApplicationPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("౨ৎ・moderator applications")
    .setDescription(
      "interested in helping the community?\n\nclick below to submit a moderator application."
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("moderator_apply")
      .setLabel("📝 apply for moderator")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// ==========================================================
// FULL SERVER REPAIR
// ==========================================================

async function repairServer(guild) {
  console.log("");
  console.log("==========================================");
  console.log(`🔧 REPAIRING: ${guild.name}`);
  console.log("==========================================");

  // DELETE CHANNELS FIRST
  await deleteAllChannels(guild);

  // DELETE ROLES
  await deleteAllRoles(guild);

  // CREATE NEW ROLES
  const roles = await createAllRoles(guild);

  console.log("✅ New roles created.");

  // --------------------------------------------------------
  // INFO
  // --------------------------------------------------------

  const info = await createCategory(
    guild,
    "INFO",
    roles
  );

  const rules = await createText(
    guild,
    info,
    "rules"
  );

  const announcements = await createText(
    guild,
    info,
    "announcements"
  );

  const welcome = await createText(
    guild,
    info,
    "welcome"
  );

  const goodbye = await createText(
    guild,
    info,
    "goodbye"
  );

  const introductions = await createText(
    guild,
    info,
    "introductions"
  );

  const boosts = await createText(
    guild,
    info,
    "boosts"
  );

  const partnerships = await createText(
    guild,
    info,
    "partnerships"
  );

  const selfRoles = await createText(
    guild,
    info,
    "self-roles"
  );

  // --------------------------------------------------------
  // COMMUNITY
  // --------------------------------------------------------

  const community = await createCategory(
    guild,
    "COMMUNITY",
    roles
  );

  const chat = await createText(
    guild,
    community,
    "chat"
  );

  const makeFriends = await createText(
    guild,
    community,
    "make-friends"
  );

  const media = await createText(
    guild,
    community,
    "media"
  );

  const memes = await createText(
    guild,
    community,
    "memes"
  );

  // --------------------------------------------------------
  // EXTRAS
  // --------------------------------------------------------

  const extras = await createCategory(
    guild,
    "EXTRAS",
    roles
  );

  const levelsChannel = await createText(
    guild,
    extras,
    "levels"
  );

  const starboard = await createText(
    guild,
    extras,
    "starboard"
  );

  const confessions = await createText(
    guild,
    extras,
    "confessions"
  );

  const support = await createText(
    guild,
    extras,
    "support"
  );

  // --------------------------------------------------------
  // VOICE
  // --------------------------------------------------------

  const voice = await createCategory(
    guild,
    "VOICE",
    roles
  );

  const generalVC = await createVoice(
    guild,
    voice,
    "VC"
  );

  // --------------------------------------------------------
  // STAFF
  // --------------------------------------------------------

  const staff = await createCategory(
    guild,
    "STAFF",
    roles,
    true
  );

  const staffChat = await createText(
    guild,
    staff,
    "staff-chat"
  );

  const moderation = await createText(
    guild,
    staff,
    "moderation"
  );

  const staffLounge = await createText(
    guild,
    staff,
    "staff-lounge"
  );

  const staffVC = await createVoice(
    guild,
    staff,
    "staff-vc"
  );

  // --------------------------------------------------------
  // LOCK INFO CHANNELS
  // --------------------------------------------------------

  const locked = [
    rules,
    announcements,
    welcome,
    goodbye,
    boosts,
    partnerships,
  ];

  for (const channel of locked) {
    await channel.permissionOverwrites.edit(
      guild.roles.everyone.id,
      {
        SendMessages: false,
      }
    );
  }

  // --------------------------------------------------------
  // SEND PANELS
  // --------------------------------------------------------

  await sendRules(rules);
  await sendWelcome(welcome);
  await sendLevels(levelsChannel);
  await sendSelfRoles(selfRoles, roles);
  await sendConfessionPanel(confessions);
  await sendTicketPanel(support);

  // --------------------------------------------------------
  // STAFF INFO
  // --------------------------------------------------------

  await staffChat.send(
    "౨ৎ・**staff chat**\n\nPrivate staff discussion."
  );

  await moderation.send(
    "౨ৎ・**moderation**\n\nUse this channel for moderation activity."
  );

  await staffLounge.send(
    "౨ৎ・**staff lounge**\n\nStaff hangout."
  );

  // --------------------------------------------------------
  // FINISH
  // --------------------------------------------------------

  console.log("");
  console.log("==========================================");
  console.log("✅ SERVER REPAIR COMPLETE");
  console.log("==========================================");
}

// ==========================================================
// SLASH COMMANDS
// ==========================================================

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription(
      "Completely reset and rebuild the server."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription(
      "View your level and XP."
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription(
      "View the server XP leaderboard."
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription(
      "View server information."
    ),

  new SlashCommandBuilder()
    .setName("confess")
    .setDescription(
      "Send an anonymous confession."
    ),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription(
      "View bot commands."
    ),

  new SlashCommandBuilder()
    .setName("restart")
    .setDescription(
      "Restart the bot."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),
].map((command) => command.toJSON());

// ==========================================================
// REGISTER COMMANDS
// ==========================================================

async function registerCommands() {
  const rest = new REST({
    version: "10",
  }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands,
      }
    );

    console.log("✅ Slash commands registered.");
  } catch (error) {
    console.error(
      "❌ Command registration error:",
      error
    );
  }
}

// ==========================================================
// READY
// ==========================================================

client.once("ready", async () => {
  console.log("");
  console.log("==========================================");
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log("==========================================");

  client.user.setPresence({
    activities: [
      {
        name: "the community >ᴗ<",
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });

  await registerCommands();

  console.log(
    `🌐 Connected to ${client.guilds.cache.size} server(s).`
  );
});

// ==========================================================
// NEW SERVER
// ==========================================================

client.on("guildCreate", async (guild) => {
  console.log(
    `✨ Bot joined ${guild.name}`
  );

  try {
    await repairServer(guild);
  } catch (error) {
    console.error(
      `❌ Setup failed for ${guild.name}:`,
      error
    );
  }
});

// ==========================================================
// MEMBER JOIN
// ==========================================================

client.on("guildMemberAdd", async (member) => {
  try {
    const botRole = member.guild.roles.cache.find(
      (role) => role.name === "bots"
    );

    const memberRole = member.guild.roles.cache.find(
      (role) => role.name === "member"
    );

    if (member.user.bot && botRole) {
      await member.roles.add(botRole);
    } else if (!member.user.bot && memberRole) {
      await member.roles.add(memberRole);
    }

    const welcomeChannel =
      member.guild.channels.cache.find(
        (channel) =>
          channel.name ===
          `${CHANNEL_PREFIX}welcome`
      );

    if (
      welcomeChannel &&
      welcomeChannel.isTextBased()
    ) {
      await welcomeChannel.send(
        `welcome ${member} >ᴗ<`
      );
    }
  } catch (error) {
    console.error(
      "❌ Member join error:",
      error
    );
  }
});

// ==========================================================
// MESSAGE XP
// ==========================================================

const xpCooldown = new Set();

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (xpCooldown.has(message.author.id)) {
    return;
  }

  xpCooldown.add(message.author.id);

  setTimeout(() => {
    xpCooldown.delete(message.author.id);
  }, 60000);

  if (!levels[message.guild.id]) {
    levels[message.guild.id] = {};
  }

  if (!levels[message.guild.id][message.author.id]) {
    levels[message.guild.id][message.author.id] = {
      xp: 0,
    };
  }

  const userData =
    levels[message.guild.id][message.author.id];

  const oldLevel = calculateLevel(userData.xp);

  const gained =
    Math.floor(Math.random() * 11) + 15;

  userData.xp += gained;

  const newLevel = calculateLevel(userData.xp);

  saveLevels();

  if (newLevel > oldLevel) {
    const rewardName =
      ROLE_NAMES.includes(`level ${newLevel}`)
        ? `level ${newLevel}`
        : null;

    if (rewardName) {
      const rewardRole =
        message.guild.roles.cache.find(
          (role) => role.name === rewardName
        );

      if (rewardRole) {
        try {
          await message.member.roles.add(
            rewardRole
          );
        } catch {}
      }
    }

    await message.channel.send(
      `🎉 ${message.author} reached **level ${newLevel}**! >ᴗ<`
    );
  }
});

// ==========================================================
// INTERACTIONS
// ==========================================================

client.on(
  "interactionCreate",
  async (interaction) => {
    try {
      // ----------------------------------------------------
      // SLASH COMMANDS
      // ----------------------------------------------------

      if (interaction.isChatInputCommand()) {
        // SETUP
        if (interaction.commandName === "setup") {
          if (
            !interaction.memberPermissions.has(
              PermissionFlagsBits.ManageGuild
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need **Manage Server** to use this.",
              ephemeral: true,
            });
          }

          await interaction.reply({
            content:
              "🔧 Starting a complete server repair...\n\n⚠️ Existing channels and removable roles will be deleted.",
            ephemeral: true,
          });

          await repairServer(
            interaction.guild
          );

          return;
        }

        // RANK
        if (interaction.commandName === "rank") {
          const guildId = interaction.guild.id;
          const userId = interaction.user.id;

          const data =
            levels[guildId]?.[userId] || {
              xp: 0,
            };

          const level = calculateLevel(data.xp);
          const currentLevelXP =
            xpForLevel(level);
          const nextLevelXP =
            xpForLevel(level + 1);

          const progress =
            data.xp - currentLevelXP;

          const needed =
            nextLevelXP - currentLevelXP;

          const embed = new EmbedBuilder()
            .setTitle("౨ৎ・your rank")
            .setDescription(
              [
                `**User:** ${interaction.user}`,
                `**Level:** ${level}`,
                `**XP:** ${progress} / ${needed}`,
                "",
                `**Total XP:** ${data.xp}`,
              ].join("\n")
            );

          return interaction.reply({
            embeds: [embed],
          });
        }

        // LEADERBOARD
        if (
          interaction.commandName ===
          "leaderboard"
        ) {
          const guildData =
            levels[interaction.guild.id] || {};

          const entries = Object.entries(
            guildData
          )
            .sort(
              (a, b) =>
                (b[1]?.xp || 0) -
                (a[1]?.xp || 0)
            )
            .slice(0, 10);

          if (!entries.length) {
            return interaction.reply(
              "No XP data yet. Start chatting! >ᴗ<"
            );
          }

          const lines = [];

          for (
            let i = 0;
            i < entries.length;
            i++
          ) {
            const [userId, data] =
              entries[i];

            const user =
              await client.users
                .fetch(userId)
                .catch(() => null);

            if (!user) continue;

            lines.push(
              `**${i + 1}.** ${user} — ${data.xp} XP`
            );
          }

          const embed = new EmbedBuilder()
            .setTitle("౨ৎ・leaderboard")
            .setDescription(
              lines.join("\n")
            );

          return interaction.reply({
            embeds: [embed],
          });
        }

        // SERVER INFO
        if (
          interaction.commandName ===
          "serverinfo"
        ) {
          const guild =
            interaction.guild;

          const embed = new EmbedBuilder()
            .setTitle(
              `౨ৎ・${guild.name}`
            )
            .setDescription(
              [
                `**Owner:** <@${guild.ownerId}>`,
                `**Members:** ${guild.memberCount}`,
                `**Channels:** ${guild.channels.cache.size}`,
                `**Roles:** ${guild.roles.cache.size}`,
                `**Created:** <t:${Math.floor(
                  guild.createdTimestamp / 1000
                )}:D`,
              ].join("\n")
            );

          return interaction.reply({
            embeds: [embed],
          });
        }

        // CONFESS
        if (
          interaction.commandName ===
          "confess"
        ) {
          const modal =
            new ModalBuilder()
              .setCustomId(
                "confession_modal"
              )
              .setTitle(
                "anonymous confession"
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                "confession_text"
              )
              .setLabel(
                "your confession"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000);

          const row =
            new ActionRowBuilder().addComponents(
              input
            );

          modal.addComponents(row);

          return interaction.showModal(
            modal
          );
        }

        // HELP
        if (
          interaction.commandName ===
          "help"
        ) {
          const embed = new EmbedBuilder()
            .setTitle("౨ৎ・help")
            .setDescription(
              [
                "`/rank` — view your level",
                "`/leaderboard` — XP leaderboard",
                "`/serverinfo` — server information",
                "`/confess` — anonymous confession",
                "`/setup` — repair/reset server",
                "`/help` — show commands",
                "`/restart` — restart bot",
              ].join("\n")
            );

          return interaction.reply({
            embeds: [embed],
            ephemeral: true,
          });
        }

        // RESTART
        if (
          interaction.commandName ===
          "restart"
        ) {
          if (
            !interaction.memberPermissions.has(
              PermissionFlagsBits.Administrator
            )
          ) {
            return interaction.reply({
              content:
                "❌ Administrator permission required.",
              ephemeral: true,
            });
          }

          await interaction.reply(
            "♻️ Restarting..."
          );

          setTimeout(() => {
            process.exit(0);
          }, 1000);

          return;
        }
      }

      // ----------------------------------------------------
      // BUTTONS
      // ----------------------------------------------------

      if (interaction.isButton()) {
        const guild =
          interaction.guild;

        // SELF ROLE BUTTONS
        const roleButtons = {
          role_sheher: "she/her",
          role_hehim: "he/him",
          role_theythem: "they/them",
          role_any: "any pronouns",

          role_adult: "adult",
          role_minor: "minor",

          role_artist: "artist",
          role_music: "music",
          role_anime: "anime",

          role_introvert: "introvert",
          role_extrovert: "extrovert",

          role_announcements:
            "announcements",
          role_events: "events",
          role_giveaways:
            "giveaways",
          role_polls: "polls",
        };

        if (
          roleButtons[
            interaction.customId
          ]
        ) {
          const roleName =
            roleButtons[
              interaction.customId
            ];

          const role =
            guild.roles.cache.find(
              (r) =>
                r.name === roleName
            );

          if (!role) {
            return interaction.reply({
              content:
                "❌ That role does not exist.",
              ephemeral: true,
            });
          }

          if (
            interaction.member.roles.cache.has(
              role.id
            )
          ) {
            await interaction.member.roles.remove(
              role
            );

            return interaction.reply({
              content: `Removed **${roleName}** >ᴗ<`,
              ephemeral: true,
            });
          }

          await interaction.member.roles.add(
            role
          );

          return interaction.reply({
            content: `Added **${roleName}** >ᴗ<`,
            ephemeral: true,
          });
        }

        // CONFESSION BUTTON
        if (
          interaction.customId ===
          "confess_button"
        ) {
          const modal =
            new ModalBuilder()
              .setCustomId(
                "confession_modal"
              )
              .setTitle(
                "anonymous confession"
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                "confession_text"
              )
              .setLabel(
                "your confession"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder().addComponents(
              input
            )
          );

          return interaction.showModal(
            modal
          );
        }

        // CREATE TICKET
        if (
          interaction.customId ===
          "create_ticket"
        ) {
          const existing =
            guild.channels.cache.find(
              (channel) =>
                channel.name ===
                `${CHANNEL_PREFIX}ticket-${interaction.user.username
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "")
                  .slice(0, 15)}`
            );

          if (existing) {
            return interaction.reply({
              content:
                "You already have a ticket open.",
              ephemeral: true,
            });
          }

          const staffRoles = [
            "owner",
            "co-owner",
            "admin",
            "moderator",
            "staff",
            "support",
          ];

          const overwrites = [
            {
              id: guild.roles.everyone.id,
              deny: [
                PermissionFlagsBits.ViewChannel,
              ],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ];

          for (const roleName of staffRoles) {
            const role =
              guild.roles.cache.find(
                (r) =>
                  r.name === roleName
              );

            if (role) {
              overwrites.push({
                id: role.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              });
            }
          }

          const ticket =
            await guild.channels.create({
              name: `${CHANNEL_PREFIX}ticket-${interaction.user.username
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .slice(0, 15)}`,
              type: ChannelType.GuildText,
              permissionOverwrites:
                overwrites,
            });

          await ticket.send(
            `౨ৎ・Welcome ${interaction.user}!\n\nPlease explain what you need help with.`
          );

          return interaction.reply({
            content: `🎫 Ticket created: ${ticket}`,
            ephemeral: true,
          });
        }

        // MODERATOR APPLICATION
        if (
          interaction.customId ===
          "moderator_apply"
        ) {
          const modal =
            new ModalBuilder()
              .setCustomId(
                "moderator_application_modal"
              )
              .setTitle(
                "moderator application"
              );

          const why =
            new TextInputBuilder()
              .setCustomId("why")
              .setLabel(
                "why should we choose you?"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000);

          const experience =
            new TextInputBuilder()
              .setCustomId(
                "experience"
              )
              .setLabel(
                "previous experience"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder().addComponents(
              why
            ),
            new ActionRowBuilder().addComponents(
              experience
            )
          );

          return interaction.showModal(
            modal
          );
        }
      }

      // ----------------------------------------------------
      // MODALS
      // ----------------------------------------------------

      if (interaction.isModalSubmit()) {
        // CONFESSION
        if (
          interaction.customId ===
          "confession_modal"
        ) {
          const text =
            interaction.fields.getTextInputValue(
              "confession_text"
            );

          const channel =
            interaction.guild.channels.cache.find(
              (c) =>
                c.name ===
                `${CHANNEL_PREFIX}confessions`
            );

          if (channel) {
            const embed =
              new EmbedBuilder()
                .setTitle(
                  "౨ৎ・anonymous confession"
                )
                .setDescription(text)
                .setFooter({
                  text: "anonymous",
                });

            await channel.send({
              embeds: [embed],
            });
          }

          return interaction.reply({
            content:
              "Your confession was sent anonymously. >ᴗ<",
            ephemeral: true,
          });
        }

        // MODERATOR APPLICATION
        if (
          interaction.customId ===
          "moderator_application_modal"
        ) {
          const why =
            interaction.fields.getTextInputValue(
              "why"
            );

          const experience =
            interaction.fields.getTextInputValue(
              "experience"
            );

          const channel =
            interaction.guild.channels.cache.find(
              (c) =>
                c.name ===
                `${CHANNEL_PREFIX}moderation`
            );

          if (channel) {
            const embed =
              new EmbedBuilder()
                .setTitle(
                  "౨ৎ・new moderator application"
                )
                .addFields(
                  {
                    name: "applicant",
                    value: `${interaction.user}`,
                  },
                  {
                    name: "why",
                    value: why,
                  },
                  {
                    name: "experience",
                    value: experience,
                  }
                )
                .setTimestamp();

            await channel.send({
              embeds: [embed],
            });
          }

          return interaction.reply({
            content:
              "Your moderator application was submitted. >ᴗ<",
            ephemeral: true,
          });
        }
      }
    } catch (error) {
      console.error(
        "❌ Interaction error:",
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {
        try {
          await interaction.followUp({
            content:
              "❌ Something went wrong.",
            ephemeral: true,
          });
        } catch {}
      } else {
        try {
          await interaction.reply({
            content:
              "❌ Something went wrong.",
            ephemeral: true,
          });
        } catch {}
      }
    }
  }
);

// ==========================================================
// LOGIN
// ==========================================================

client.login(TOKEN); 