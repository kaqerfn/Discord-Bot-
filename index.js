// ==========================================================
// KAQER COMMUNITY BOT
// DISCORD.JS v14
// FULL SERVER REPAIR + FIXED LEVEL SYSTEM
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
  console.error("❌ TOKEN is missing from Railway variables.");
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
// LEVEL SETTINGS
// ==========================================================

const XP_MIN = 15;
const XP_MAX = 25;
const XP_COOLDOWN = 60000;

// XP required for each level:
// Level 1 = 100
// Level 2 = 400
// Level 3 = 900
// Level 4 = 1600
// Level 5 = 2500
// Level 10 = 10000
// Level 20 = 40000
// etc.

function xpForLevel(level) {
  return level * level * 100;
}

function getLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

// ==========================================================
// LEVEL ROLES
// ==========================================================

const LEVEL_ROLES = [
  {
    level: 5,
    name: "level 5",
  },
  {
    level: 10,
    name: "level 10",
  },
  {
    level: 20,
    name: "level 20",
  },
  {
    level: 30,
    name: "level 30",
  },
  {
    level: 50,
    name: "level 50",
  },
];

// ==========================================================
// ALL ROLES
// NO EMOJIS
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
// XP STORAGE
// ==========================================================

const DATA_FOLDER = path.join(__dirname, "data");
const LEVEL_FILE = path.join(DATA_FOLDER, "levels.json");

if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER, {
    recursive: true,
  });
}

if (!fs.existsSync(LEVEL_FILE)) {
  fs.writeFileSync(
    LEVEL_FILE,
    "{}"
  );
}

let levels = {};

try {
  levels = JSON.parse(
    fs.readFileSync(
      LEVEL_FILE,
      "utf8"
    )
  );
} catch {
  levels = {};
}

function saveLevels() {
  try {
    fs.writeFileSync(
      LEVEL_FILE,
      JSON.stringify(
        levels,
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      "❌ Could not save XP:",
      error.message
    );
  }
}

// ==========================================================
// XP COOLDOWN
// ==========================================================

const xpCooldown = new Set();

// ==========================================================
// FIND / CREATE USER DATA
// ==========================================================

function getUserData(guildId, userId) {
  if (!levels[guildId]) {
    levels[guildId] = {};
  }

  if (!levels[guildId][userId]) {
    levels[guildId][userId] = {
      xp: 0,
    };
  }

  return levels[guildId][userId];
}

// ==========================================================
// LEVEL ROLE SYSTEM
// ==========================================================

async function updateLevelRole(member) {
  try {
    const data = getUserData(
      member.guild.id,
      member.id
    );

    const currentLevel = getLevel(
      data.xp
    );

    // Find the highest reward role the user qualifies for.
    let highestReward = null;

    for (const reward of LEVEL_ROLES) {
      if (
        currentLevel >= reward.level
      ) {
        highestReward = reward;
      }
    }

    // If they have not reached level 5,
    // remove any accidental level roles.
    if (!highestReward) {
      for (const reward of LEVEL_ROLES) {
        const role =
          member.guild.roles.cache.find(
            (r) =>
              r.name === reward.name
          );

        if (
          role &&
          member.roles.cache.has(
            role.id
          )
        ) {
          try {
            await member.roles.remove(
              role
            );
          } catch {}
        }
      }

      return;
    }

    const highestRole =
      member.guild.roles.cache.find(
        (r) =>
          r.name ===
          highestReward.name
      );

    if (!highestRole) {
      console.log(
        `⚠️ Missing role: ${highestReward.name}`
      );
      return;
    }

    // Remove every lower level role.
    for (const reward of LEVEL_ROLES) {
      if (
        reward.level >=
        highestReward.level
      ) {
        continue;
      }

      const oldRole =
        member.guild.roles.cache.find(
          (r) =>
            r.name ===
            reward.name
        );

      if (
        oldRole &&
        member.roles.cache.has(
          oldRole.id
        )
      ) {
        try {
          await member.roles.remove(
            oldRole
          );
        } catch (error) {
          console.log(
            `⚠️ Could not remove ${oldRole.name}: ${error.message}`
          );
        }
      }
    }

    // Give the highest level role.
    if (
      !member.roles.cache.has(
        highestRole.id
      )
    ) {
      try {
        await member.roles.add(
          highestRole
        );

        console.log(
          `⭐ ${member.user.tag} received ${highestRole.name}`
        );
      } catch (error) {
        console.log(
          `❌ Could not give ${highestRole.name} to ${member.user.tag}: ${error.message}`
        );
      }
    }
  } catch (error) {
    console.error(
      "Level role update error:",
      error.message
    );
  }
}

// ==========================================================
// FIX BOT ROLE POSITION
// ==========================================================

async function fixBotRolePosition(guild) {
  try {
    const botMember =
      guild.members.me;

    if (!botMember) return;

    const botRole =
      botMember.roles.botRole;

    if (!botRole) {
      console.log(
        "⚠️ Bot role could not be found."
      );
      return;
    }

    const highestRole =
      guild.roles.highest;

    if (
      botRole.position <
      highestRole.position
    ) {
      try {
        await botRole.setPosition(
          guild.roles.highest.position - 1
        );

        console.log(
          "⬆️ Bot role moved above the server roles."
        );
      } catch (error) {
        console.log(
          "⚠️ Could not automatically move bot role:",
          error.message
        );
      }
    }
  } catch (error) {
    console.log(
      "Bot role position error:",
      error.message
    );
  }
}

// ==========================================================
// DELETE CHANNELS
// ==========================================================

async function deleteChannels(guild) {
  console.log(
    "🗑️ Deleting ALL channels..."
  );

  const channels = [
    ...guild.channels.cache.values(),
  ];

  for (const channel of channels) {
    try {
      await channel.delete(
        "Complete Kaqer server repair"
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

  await new Promise((resolve) =>
    setTimeout(resolve, 2000)
  );

  console.log(
    "✅ Channel deletion finished."
  );
}

// ==========================================================
// DELETE ROLES
// ==========================================================

async function deleteRoles(guild) {
  console.log(
    "🗑️ Deleting removable roles..."
  );

  const roles = [
    ...guild.roles.cache.values(),
  ]
    .filter(
      (role) =>
        role.id !== guild.id
    )
    .sort(
      (a, b) =>
        b.position - a.position
    );

  for (const role of roles) {
    try {
      if (role.managed) {
        console.log(
          `⏭️ Skipping managed role: ${role.name}`
        );
        continue;
      }

      await role.delete(
        "Complete Kaqer server repair"
      );

      console.log(
        `🗑️ Deleted role: ${role.name}`
      );
    } catch (error) {
      console.log(
        `⚠️ Could not delete role ${role.name}: ${error.message}`
      );
    }
  }

  await new Promise((resolve) =>
    setTimeout(resolve, 1500)
  );

  console.log(
    "✅ Role deletion finished."
  );
}

// ==========================================================
// CREATE ROLES
// ==========================================================

async function createRoles(guild) {
  const roles = {};

  console.log(
    "✨ Creating roles..."
  );

  for (const name of ROLE_NAMES) {
    try {
      const role =
        await guild.roles.create({
          name,
          reason:
            "Kaqer server repair",
        });

      roles[name] = role;

      console.log(
        `✅ Created role: ${name}`
      );
    } catch (error) {
      console.log(
        `❌ Could not create role ${name}: ${error.message}`
      );
    }
  }

  return roles;
}

// ==========================================================
// STAFF PERMISSIONS
// ==========================================================

function staffOverwrites(
  guild,
  roles
) {
  const overwrites = [
    {
      id:
        guild.roles.everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
      ],
    },
  ];

  const staffRoles = [
    "owner",
    "co-owner",
    "admin",
    "moderator",
    "staff",
    "support",
  ];

  for (const name of staffRoles) {
    if (!roles[name]) continue;

    overwrites.push({
      id: roles[name].id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ],
    });
  }

  return overwrites;
}

// ==========================================================
// CATEGORY
// ==========================================================

async function makeCategory(
  guild,
  name,
  roles,
  staffOnly = false
) {
  const options = {
    name:
      `${CATEGORY_PREFIX}${name}`,
    type:
      ChannelType.GuildCategory,
  };

  if (staffOnly) {
    options.permissionOverwrites =
      staffOverwrites(
        guild,
        roles
      );
  }

  return guild.channels.create(
    options
  );
}

// ==========================================================
// TEXT
// ==========================================================

async function makeText(
  guild,
  category,
  name,
  options = {}
) {
  return guild.channels.create({
    name:
      `${CHANNEL_PREFIX}${name}`,
    type:
      ChannelType.GuildText,
    parent: category.id,
    ...options,
  });
}

// ==========================================================
// VOICE
// ==========================================================

async function makeVoice(
  guild,
  category,
  name,
  options = {}
) {
  return guild.channels.create({
    name:
      `${CHANNEL_PREFIX}${name}`,
    type:
      ChannelType.GuildVoice,
    parent: category.id,
    ...options,
  });
}

// ==========================================================
// LOCK CHANNEL
// ==========================================================

async function lockChannel(
  channel,
  guild
) {
  try {
    await channel.permissionOverwrites.edit(
      guild.roles.everyone.id,
      {
        SendMessages: false,
      }
    );
  } catch (error) {
    console.log(
      `⚠️ Could not lock ${channel.name}: ${error.message}`
    );
  }
}

// ==========================================================
// RULES
// ==========================================================

async function sendRules(channel) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・rules"
      )
      .setDescription(
        [
          "**01 — Be respectful**",
          "Treat everyone with respect.",
          "",
          "**02 — No harassment**",
          "Bullying, threats, and targeted harassment are not allowed.",
          "",
          "**03 — No spam**",
          "Do not flood chats or spam pings.",
          "",
          "**04 — Keep content appropriate**",
          "Follow Discord Terms of Service.",
          "",
          "**05 — Protect privacy**",
          "Never post private information.",
          "",
          "**06 — Use the right channels**",
          "Keep conversations where they belong.",
          "",
          "**07 — Staff**",
          "Follow reasonable staff instructions.",
          "",
          "**08 — Have fun**",
          "Meet people and enjoy the community. >ᴗ<",
        ].join("\n")
      )
      .setFooter({
        text:
          "౨ৎ community rules",
      });

  await channel.send({
    embeds: [embed],
  });
}

// ==========================================================
// WELCOME
// ==========================================================

async function sendWelcome(channel) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・welcome"
      )
      .setDescription(
        [
          "welcome to the community >ᴗ<",
          "",
          "read the rules,",
          "check out self roles,",
          "and come hang out!",
        ].join("\n")
      );

  await channel.send({
    embeds: [embed],
  });
}

// ==========================================================
// LEVEL CHANNEL
// ==========================================================

async function sendLevels(channel) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・levels"
      )
      .setDescription(
        [
          "chat to earn XP >ᴗ<",
          "",
          "**level rewards**",
          "",
          "level 5",
          "level 10",
          "level 20",
          "level 30",
          "level 50",
          "",
          "Use `/rank` to check your progress.",
        ].join("\n")
      );

  await channel.send({
    embeds: [embed],
  });
}

// ==========================================================
// SELF ROLES
// ==========================================================

async function sendSelfRoles(channel) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・self roles"
      )
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
      );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("role_sheher")
        .setLabel("❤️ she/her")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_hehim")
        .setLabel("💙 he/him")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_theythem")
        .setLabel("🖤 they/them")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_any")
        .setLabel("💚 any pronouns")
        .setStyle(
          ButtonStyle.Secondary
        )
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("role_adult")
        .setLabel("🧑 adult")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_minor")
        .setLabel("🔞 minor")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_artist")
        .setLabel("🎨 artist")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_music")
        .setLabel("🎹 music")
        .setStyle(
          ButtonStyle.Secondary
        )
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("role_anime")
        .setLabel("🌝 anime")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_introvert")
        .setLabel("👤 introvert")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_extrovert")
        .setLabel("🫂 extrovert")
        .setStyle(
          ButtonStyle.Secondary
        )
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          "role_announcements"
        )
        .setLabel(
          "📣 announcements"
        )
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_events")
        .setLabel("🎫 events")
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId(
          "role_giveaways"
        )
        .setLabel(
          "🫡 giveaways"
        )
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId("role_polls")
        .setLabel("🐻‍❄️ polls")
        .setStyle(
          ButtonStyle.Secondary
        )
    ),
  ];

  await channel.send({
    embeds: [embed],
    components: rows,
  });
}

// ==========================================================
// CONFESSIONS
// ==========================================================

async function sendConfessions(
  channel
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・anonymous confessions"
      )
      .setDescription(
        "have something to say?\n\nsend it anonymously below. >ᴗ<"
      );

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          "confess_button"
        )
        .setLabel(
          "💭 make a confession"
        )
        .setStyle(
          ButtonStyle.Secondary
        )
    );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// ==========================================================
// SUPPORT
// ==========================================================

async function sendSupport(channel) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・support"
      )
      .setDescription(
        "need help?\n\ncreate a private ticket and staff will help you."
      );

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          "create_ticket"
        )
        .setLabel(
          "🎫 create ticket"
        )
        .setStyle(
          ButtonStyle.Secondary
        )
    );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// ==========================================================
// APPLICATIONS
// ==========================================================

async function sendApplications(
  channel
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・moderator applications"
      )
      .setDescription(
        "want to help the community?\n\nclick below to apply."
      );

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          "moderator_apply"
        )
        .setLabel(
          "📝 apply for moderator"
        )
        .setStyle(
          ButtonStyle.Secondary
        )
    );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// ==========================================================
// FULL REPAIR
// ==========================================================

async function repairServer(guild) {
  console.log(
    "======================================"
  );

  console.log(
    `🔧 REPAIRING ${guild.name}`
  );

  console.log(
    "======================================"
  );

  // DELETE EVERYTHING FIRST
  await deleteChannels(guild);
  await deleteRoles(guild);

  // CREATE ROLES
  const roles =
    await createRoles(guild);

  // IMPORTANT:
  // Refresh guild data after role creation.
  await guild.roles.fetch();

  // Try to move bot above the new roles.
  await fixBotRolePosition(guild);

  // ========================================================
  // INFO
  // ========================================================

  const info =
    await makeCategory(
      guild,
      "INFO",
      roles
    );

  const rules =
    await makeText(
      guild,
      info,
      "rules"
    );

  const announcements =
    await makeText(
      guild,
      info,
      "announcements"
    );

  const welcome =
    await makeText(
      guild,
      info,
      "welcome"
    );

  const goodbye =
    await makeText(
      guild,
      info,
      "goodbye"
    );

  const introductions =
    await makeText(
      guild,
      info,
      "introductions"
    );

  const boosts =
    await makeText(
      guild,
      info,
      "boosts"
    );

  const partnerships =
    await makeText(
      guild,
      info,
      "partnerships"
    );

  const selfRoles =
    await makeText(
      guild,
      info,
      "self-roles"
    );

  // ========================================================
  // COMMUNITY
  // ========================================================

  const community =
    await makeCategory(
      guild,
      "COMMUNITY",
      roles
    );

  await makeText(
    guild,
    community,
    "chat"
  );

  await makeText(
    guild,
    community,
    "make-friends"
  );

  await makeText(
    guild,
    community,
    "media"
  );

  await makeText(
    guild,
    community,
    "memes"
  );

  // ========================================================
  // EXTRAS
  // ========================================================

  const extras =
    await makeCategory(
      guild,
      "EXTRAS",
      roles
    );

  const levelsChannel =
    await makeText(
      guild,
      extras,
      "levels"
    );

  await makeText(
    guild,
    extras,
    "starboard"
  );

  const confessions =
    await makeText(
      guild,
      extras,
      "confessions"
    );

  const support =
    await makeText(
      guild,
      extras,
      "support"
    );

  // ========================================================
  // VOICE
  // ========================================================

  const voice =
    await makeCategory(
      guild,
      "VOICE",
      roles
    );

  await makeVoice(
    guild,
    voice,
    "VC"
  );

  // ========================================================
  // STAFF
  // ========================================================

  const staff =
    await makeCategory(
      guild,
      "STAFF",
      roles,
      true
    );

  await makeText(
    guild,
    staff,
    "staff-chat"
  );

  const moderation =
    await makeText(
      guild,
      staff,
      "moderation"
    );

  await makeText(
    guild,
    staff,
    "staff-lounge"
  );

  await makeVoice(
    guild,
    staff,
    "staff-vc"
  );

  // ========================================================
  // LOCK INFO
  // ========================================================

  await lockChannel(
    rules,
    guild
  );

  await lockChannel(
    announcements,
    guild
  );

  await lockChannel(
    welcome,
    guild
  );

  await lockChannel(
    goodbye,
    guild
  );

  await lockChannel(
    boosts,
    guild
  );

  await lockChannel(
    partnerships,
    guild
  );

  // ========================================================
  // SEND PANELS
  // ========================================================

  await sendRules(rules);
  await sendWelcome(welcome);
  await sendSelfRoles(selfRoles);
  await sendLevels(levelsChannel);
  await sendConfessions(confessions);
  await sendSupport(support);
  await sendApplications(
    moderation
  );

  await moderation.send(
    "౨ৎ・**staff moderation**\n\nUse this channel for moderation."
  );

  // ========================================================
  // FINAL ROLE POSITION FIX
  // ========================================================

  await guild.roles.fetch();
  await fixBotRolePosition(guild);

  console.log(
    "======================================"
  );

  console.log(
    "✅ COMPLETE SERVER REPAIR FINISHED"
  );

  console.log(
    "======================================"
  );
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
      "View your XP and level."
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription(
      "View the XP leaderboard."
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
].map((command) =>
  command.toJSON()
);

// ==========================================================
// READY
// ==========================================================

client.once(
  "ready",
  async () => {
    console.log(
      `🤖 ${client.user.tag} is online!`
    );

    client.user.setPresence({
      activities: [
        {
          name:
            "the community >ᴗ<",
          type:
            ActivityType.Watching,
        },
      ],
      status: "online",
    });

    try {
      const rest =
        new REST({
          version: "10",
        }).setToken(
          TOKEN
        );

      await rest.put(
        Routes.applicationCommands(
          client.user.id
        ),
        {
          body: commands,
        }
      );

      console.log(
        "✅ Commands registered."
      );
    } catch (error) {
      console.error(
        "❌ Command registration error:",
        error.message
      );
    }
  }
);

// ==========================================================
// MEMBER JOIN
// ==========================================================

client.on(
  "guildMemberAdd",
  async (member) => {
    try {
      const roleName =
        member.user.bot
          ? "bots"
          : "member";

      const role =
        member.guild.roles.cache.find(
          (r) =>
            r.name ===
            roleName
        );

      if (role) {
        await member.roles.add(
          role
        );
      }

      const welcome =
        member.guild.channels.cache.find(
          (c) =>
            c.name ===
            `${CHANNEL_PREFIX}welcome`
        );

      if (
        welcome &&
        welcome.isTextBased()
      ) {
        await welcome.send(
          `welcome ${member} >ᴗ<`
        );
      }
    } catch (error) {
      console.error(
        "Member join error:",
        error.message
      );
    }
  }
);

// ==========================================================
// MESSAGE XP
// ==========================================================

client.on(
  "messageCreate",
  async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;

    // XP cooldown.
    if (
      xpCooldown.has(
        message.author.id
      )
    ) {
      return;
    }

    xpCooldown.add(
      message.author.id
    );

    setTimeout(() => {
      xpCooldown.delete(
        message.author.id
      );
    }, XP_COOLDOWN);

    // Get user data.
    const data =
      getUserData(
        message.guild.id,
        message.author.id
      );

    const oldXP =
      data.xp;

    const oldLevel =
      getLevel(oldXP);

    // Random XP from 15-25.
    const gainedXP =
      Math.floor(
        Math.random() *
          (XP_MAX - XP_MIN + 1)
      ) + XP_MIN;

    data.xp += gainedXP;

    const newLevel =
      getLevel(data.xp);

    saveLevels();

    // ALWAYS update the reward role.
    // This is the important fix.
    await updateLevelRole(
      message.member
    );

    // Announce actual level ups.
    if (
      newLevel >
      oldLevel
    ) {
      const levelChannel =
        message.guild.channels.cache.find(
          (channel) =>
            channel.name ===
            `${CHANNEL_PREFIX}levels`
        );

      const target =
        levelChannel ||
        message.channel;

      await target.send(
        `🎉 ${message.author} reached **level ${newLevel}**! >ᴗ<`
      );
    }

    console.log(
      `${message.author.tag}: +${gainedXP} XP | ${data.xp} total | level ${newLevel}`
    );
  }
);

// ==========================================================
// INTERACTIONS
// ==========================================================

client.on(
  "interactionCreate",
  async (interaction) => {
    try {
      // ====================================================
      // SLASH COMMANDS
      // ====================================================

      if (
        interaction.isChatInputCommand()
      ) {
        // ==================================================
        // SETUP
        // ==================================================

        if (
          interaction.commandName ===
          "setup"
        ) {
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

          // Defer immediately.
          await interaction.deferReply({
            ephemeral: true,
          });

          try {
            await interaction.editReply(
              "🔧 **Starting complete server repair...**\n\n🗑️ Deleting channels and roles..."
            );

            await repairServer(
              interaction.guild
            );

            await interaction.editReply(
              "✅ **Repair complete!**\n\n౨ৎ Server rebuilt successfully with the `౨ৎ` and `>ᴗ<` style.\n\n⭐ The level system is also fixed through level 50."
            );
          } catch (error) {
            console.error(
              "❌ REPAIR ERROR:",
              error
            );

            try {
              await interaction.editReply(
                `❌ **Repair failed.**\n\n\`${error.message}\`\n\nGive the bot **Administrator** permission and try again.`
              );
            } catch {}
          }

          return;
        }

        // ==================================================
        // RANK
        // ==================================================

        if (
          interaction.commandName ===
          "rank"
        ) {
          const data =
            getUserData(
              interaction.guild.id,
              interaction.user.id
            );

          const level =
            getLevel(
              data.xp
            );

          const currentXP =
            xpForLevel(
              level
            );

          const nextXP =
            xpForLevel(
              level + 1
            );

          const progress =
            Math.max(
              0,
              data.xp -
                currentXP
            );

          const needed =
            nextXP -
            currentXP;

          const embed =
            new EmbedBuilder()
              .setTitle(
                "౨ৎ・your rank"
              )
              .setDescription(
                [
                  `**user:** ${interaction.user}`,
                  `**level:** ${level}`,
                  `**total XP:** ${data.xp}`,
                  `**progress:** ${progress} / ${needed}`,
                  "",
                  `**next level:** ${nextXP} XP`,
                ].join("\n")
              );

          return interaction.reply({
            embeds: [embed],
          });
        }

        // ==================================================
        // LEADERBOARD
        // ==================================================

        if (
          interaction.commandName ===
          "leaderboard"
        ) {
          const guildData =
            levels[
              interaction.guild.id
            ] || {};

          const entries =
            Object.entries(
              guildData
            )
              .sort(
                (a, b) =>
                  (b[1]?.xp || 0) -
                  (a[1]?.xp || 0)
              )
              .slice(
                0,
                10
              );

          if (
            !entries.length
          ) {
            return interaction.reply(
              "Nobody has earned XP yet. >ᴗ<"
            );
          }

          const lines =
            [];

          for (
            let i = 0;
            i <
            entries.length;
            i++
          ) {
            const [
              userId,
              data,
            ] =
              entries[i];

            const user =
              await client.users
                .fetch(
                  userId
                )
                .catch(
                  () => null
                );

            if (!user)
              continue;

            lines.push(
              `**${i + 1}.** ${user} — level ${getLevel(data.xp)} — ${data.xp} XP`
            );
          }

          const embed =
            new EmbedBuilder()
              .setTitle(
                "౨ৎ・leaderboard"
              )
              .setDescription(
                lines.join(
                  "\n"
                )
              );

          return interaction.reply({
            embeds: [embed],
          });
        }

        // ==================================================
        // SERVER INFO
        // ==================================================

        if (
          interaction.commandName ===
          "serverinfo"
        ) {
          const guild =
            interaction.guild;

          const embed =
            new EmbedBuilder()
              .setTitle(
                `౨ৎ・${guild.name}`
              )
              .setDescription(
                [
                  `**owner:** <@${guild.ownerId}>`,
                  `**members:** ${guild.memberCount}`,
                  `**channels:** ${guild.channels.cache.size}`,
                  `**roles:** ${guild.roles.cache.size}`,
                ].join("\n")
              );

          return interaction.reply({
            embeds: [embed],
          });
        }

        // ==================================================
        // CONFESS
        // ==================================================

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
              .setRequired(
                true
              )
              .setMaxLength(
                1000
              );

          modal.addComponents(
            new ActionRowBuilder().addComponents(
              input
            )
          );

          return interaction.showModal(
            modal
          );
        }

        // ==================================================
        // HELP
        // ==================================================

        if (
          interaction.commandName ===
          "help"
        ) {
          const embed =
            new EmbedBuilder()
              .setTitle(
                "౨ৎ・help"
              )
              .setDescription(
                [
                  "`/rank` — your XP",
                  "`/leaderboard` — XP leaderboard",
                  "`/serverinfo` — server info",
                  "`/confess` — anonymous confession",
                  "`/setup` — full server repair",
                  "`/help` — help",
                  "`/restart` — restart bot",
                ].join("\n")
              );

          return interaction.reply({
            embeds: [embed],
            ephemeral: true,
          });
        }

        // ==================================================
        // RESTART
        // ==================================================

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
                "❌ Administrator required.",
              ephemeral: true,
            });
          }

          await interaction.reply(
            "♻️ Restarting..."
          );

          setTimeout(
            () => {
              process.exit(0);
            },
            1000
          );

          return;
        }
      }

      // ====================================================
      // BUTTONS
      // ====================================================

      if (
        interaction.isButton()
      ) {
        const guild =
          interaction.guild;

        const roleMap = {
          role_sheher:
            "she/her",
          role_hehim:
            "he/him",
          role_theythem:
            "they/them",
          role_any:
            "any pronouns",

          role_adult:
            "adult",
          role_minor:
            "minor",

          role_artist:
            "artist",
          role_music:
            "music",
          role_anime:
            "anime",

          role_introvert:
            "introvert",
          role_extrovert:
            "extrovert",

          role_announcements:
            "announcements",
          role_events:
            "events",
          role_giveaways:
            "giveaways",
          role_polls:
            "polls",
        };

        // ==================================================
        // SELF ROLES
        // ==================================================

        if (
          roleMap[
            interaction.customId
          ]
        ) {
          const roleName =
            roleMap[
              interaction.customId
            ];

          const role =
            guild.roles.cache.find(
              (r) =>
                r.name ===
                roleName
            );

          if (!role) {
            return interaction.reply({
              content:
                "❌ That role doesn't exist.",
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
              content:
                `Removed **${roleName}** >ᴗ<`,
              ephemeral: true,
            });
          }

          await interaction.member.roles.add(
            role
          );

          return interaction.reply({
            content:
              `Added **${roleName}** >ᴗ<`,
            ephemeral: true,
          });
        }

        // ==================================================
        // CONFESSION BUTTON
        // ==================================================

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
              .setRequired(
                true
              )
              .setMaxLength(
                1000
              );

          modal.addComponents(
            new ActionRowBuilder().addComponents(
              input
            )
          );

          return interaction.showModal(
            modal
          );
        }

        // ==================================================
        // TICKET
        // ==================================================

        if (
          interaction.customId ===
          "create_ticket"
        ) {
          const username =
            interaction.user.username
              .toLowerCase()
              .replace(
                /[^a-z0-9]/g,
                ""
              )
              .slice(
                0,
                15
              );

          const ticketName =
            `${CHANNEL_PREFIX}ticket-${username}`;

          const existing =
            guild.channels.cache.find(
              (channel) =>
                channel.name ===
                ticketName
            );

          if (existing) {
            return interaction.reply({
              content:
                "🎫 You already have a ticket open.",
              ephemeral: true,
            });
          }

          const overwrites = [
            {
              id:
                guild.roles
                  .everyone.id,
              deny: [
                PermissionFlagsBits.ViewChannel,
              ],
            },
            {
              id:
                interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ];

          const staffNames = [
            "owner",
            "co-owner",
            "admin",
            "moderator",
            "staff",
            "support",
          ];

          for (
            const name of staffNames
          ) {
            const role =
              guild.roles.cache.find(
                (r) =>
                  r.name ===
                  name
              );

            if (!role)
              continue;

            overwrites.push({
              id: role.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            });
          }

          const ticket =
            await guild.channels.create(
              {
                name:
                  ticketName,
                type:
                  ChannelType.GuildText,
                permissionOverwrites:
                  overwrites,
              }
            );

          await ticket.send(
            `౨ৎ・welcome ${interaction.user} >ᴗ<\n\nTell staff what you need help with.`
          );

          return interaction.reply({
            content:
              `🎫 Ticket created: ${ticket}`,
            ephemeral: true,
          });
        }

        // ==================================================
        // MOD APPLICATION
        // ==================================================

        if (
          interaction.customId ===
          "moderator_apply"
        ) {
          const modal =
            new ModalBuilder()
              .setCustomId(
                "moderator_application"
              )
              .setTitle(
                "moderator application"
              );

          const why =
            new TextInputBuilder()
              .setCustomId(
                "why"
              )
              .setLabel(
                "why do you want to be staff?"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(
                true
              )
              .setMaxLength(
                1000
              );

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
              .setRequired(
                true
              )
              .setMaxLength(
                1000
              );

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

      // ====================================================
      // MODALS
      // ====================================================

      if (
        interaction.isModalSubmit()
      ) {
        // ==================================================
        // CONFESSION
        // ==================================================

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
                .setDescription(
                  text
                )
                .setFooter({
                  text:
                    "anonymous",
                });

            await channel.send({
              embeds: [
                embed,
              ],
            });
          }

          return interaction.reply({
            content:
              "💭 Your confession was sent anonymously. >ᴗ<",
            ephemeral: true,
          });
        }

        // ==================================================
        // APPLICATION
        // ==================================================

        if (
          interaction.customId ===
          "moderator_application"
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
                  "౨ৎ・moderator application"
                )
                .addFields(
                  {
                    name:
                      "applicant",
                    value:
                      `${interaction.user}`,
                  },
                  {
                    name:
                      "why",
                    value:
                      why,
                  },
                  {
                    name:
                      "experience",
                    value:
                      experience,
                  }
                )
                .setTimestamp();

            await channel.send({
              embeds: [
                embed,
              ],
            });
          }

          return interaction.reply({
            content:
              "📝 Application submitted. >ᴗ<",
            ephemeral: true,
          });
        }
      }
    } catch (error) {
      console.error(
        "❌ Interaction error:",
        error
      );

      try {
        if (
          interaction.deferred ||
          interaction.replied
        ) {
          await interaction.editReply({
            content:
              "❌ Something went wrong. Check Railway logs.",
          });
        } else {
          await interaction.reply({
            content:
              "❌ Something went wrong.",
            ephemeral: true,
          });
        }
      } catch {}
    }
  }
);

// ==========================================================
// LOGIN
// ==========================================================

client.login(TOKEN);