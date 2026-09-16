// ==========================================================
// KAQER COMMUNITY BOT
// DISCORD.JS v14
// AESTHETIC COMMUNITY SERVER + VERIFICATION
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
  console.error("❌ TOKEN is missing.");
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

const CHANNEL_PREFIX = "";
const CATEGORY_PREFIX = "";

// ==========================================================
// XP
// ==========================================================

const XP_MIN = 15;
const XP_MAX = 25;
const XP_COOLDOWN = 60000;

function getLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

function xpForLevel(level) {
  return level * level * 100;
}

const LEVEL_ROLES = [
  { level: 5, name: "level 5" },
  { level: 10, name: "level 10" },
  { level: 20, name: "level 20" },
  { level: 30, name: "level 30" },
  { level: 50, name: "level 50" },
];

// ==========================================================
// ROLES
// NO EMOJIS
// ==========================================================

const ROLE_NAMES = [
  "owner",
  "co-owner",
  "admin",
  "moderator",
  "staff",
  "support",

  "verified",
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
// LEVEL DATA
// ==========================================================

const DATA_FOLDER = path.join(__dirname, "data");
const LEVEL_FILE = path.join(DATA_FOLDER, "levels.json");

if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
}

if (!fs.existsSync(LEVEL_FILE)) {
  fs.writeFileSync(LEVEL_FILE, "{}");
}

let levels = {};

try {
  levels = JSON.parse(
    fs.readFileSync(LEVEL_FILE, "utf8")
  );
} catch {
  levels = {};
}

function saveLevels() {
  try {
    fs.writeFileSync(
      LEVEL_FILE,
      JSON.stringify(levels, null, 2)
    );
  } catch (error) {
    console.error(
      "❌ Could not save XP:",
      error.message
    );
  }
}

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
// XP COOLDOWN
// ==========================================================

const xpCooldown = new Set();

// ==========================================================
// LEVEL ROLE
// ==========================================================

async function updateLevelRole(member) {
  try {
    const data = getUserData(
      member.guild.id,
      member.id
    );

    const currentLevel = getLevel(data.xp);

    let highestReward = null;

    for (const reward of LEVEL_ROLES) {
      if (currentLevel >= reward.level) {
        highestReward = reward;
      }
    }

    // Remove all level roles if below level 5
    if (!highestReward) {
      for (const reward of LEVEL_ROLES) {
        const role =
          member.guild.roles.cache.find(
            r => r.name === reward.name
          );

        if (
          role &&
          member.roles.cache.has(role.id)
        ) {
          try {
            await member.roles.remove(role);
          } catch {}
        }
      }

      return;
    }

    const highestRole =
      member.guild.roles.cache.find(
        r => r.name === highestReward.name
      );

    if (!highestRole) return;

    // Remove lower level roles
    for (const reward of LEVEL_ROLES) {
      if (
        reward.level >=
        highestReward.level
      ) {
        continue;
      }

      const oldRole =
        member.guild.roles.cache.find(
          r => r.name === reward.name
        );

      if (
        oldRole &&
        member.roles.cache.has(oldRole.id)
      ) {
        try {
          await member.roles.remove(oldRole);
        } catch {}
      }
    }

    // Give highest role
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
          `⭐ ${member.user.tag} → ${highestRole.name}`
        );
      } catch (error) {
        console.log(
          `❌ Level role error: ${error.message}`
        );
      }
    }
  } catch (error) {
    console.error(
      "Level system error:",
      error.message
    );
  }
}

// ==========================================================
// DELETE CHANNELS
// ==========================================================

async function deleteChannels(guild) {
  console.log("🗑️ Deleting all channels...");

  const channels = [
    ...guild.channels.cache.values(),
  ];

  for (const channel of channels) {
    try {
      await channel.delete(
        "Complete server rebuild"
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

  await new Promise(resolve =>
    setTimeout(resolve, 2000)
  );
}

// ==========================================================
// DELETE ROLES
// ==========================================================

async function deleteRoles(guild) {
  console.log("🗑️ Deleting all removable roles...");

  const roles = [
    ...guild.roles.cache.values(),
  ]
    .filter(
      role =>
        role.id !== guild.id &&
        !role.managed
    )
    .sort(
      (a, b) =>
        b.position - a.position
    );

  for (const role of roles) {
    try {
      await role.delete(
        "Complete server rebuild"
      );

      console.log(
        `🗑️ Deleted role: ${role.name}`
      );
    } catch (error) {
      console.log(
        `⚠️ Could not delete ${role.name}: ${error.message}`
      );
    }
  }

  await new Promise(resolve =>
    setTimeout(resolve, 1500)
  );
}

// ==========================================================
// CREATE ROLES
// ==========================================================

async function createRoles(guild) {
  const roles = {};

  console.log("✨ Creating roles...");

  for (const name of ROLE_NAMES) {
    try {
      const role =
        await guild.roles.create({
          name,
          reason:
            "Kaqer community server setup",
        });

      roles[name] = role;

      console.log(
        `✅ Created role: ${name}`
      );
    } catch (error) {
      console.log(
        `❌ Could not create ${name}: ${error.message}`
      );
    }
  }

  await guild.roles.fetch();

  return roles;
}

// ==========================================================
// STAFF PERMISSIONS
// ==========================================================

function getStaffOverwrites(
  guild,
  roles
) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,

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
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  return overwrites;
}

// ==========================================================
// VERIFIED CATEGORY PERMISSIONS
// ==========================================================

function getVerifiedOverwrites(
  guild,
  roles
) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,

      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
      ],
    },
  ];

  // Verified members
  if (roles["verified"]) {
    overwrites.push({
      id: roles["verified"].id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  // Staff
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
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  return overwrites;
}

// ==========================================================
// ENTERING CATEGORY
// ==========================================================

function getEnteringOverwrites(
  guild,
  roles
) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
      ],

      deny: [
        PermissionFlagsBits.SendMessages,
      ],
    },
  ];

  // Staff can talk
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
  type = "verified"
) {
  let permissionOverwrites;

  if (type === "staff") {
    permissionOverwrites =
      getStaffOverwrites(
        guild,
        roles
      );
  }

  if (type === "verified") {
    permissionOverwrites =
      getVerifiedOverwrites(
        guild,
        roles
      );
  }

  if (type === "entering") {
    permissionOverwrites =
      getEnteringOverwrites(
        guild,
        roles
      );
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,

    ...(permissionOverwrites
      ? { permissionOverwrites }
      : {}),
  });
}

// ==========================================================
// TEXT CHANNEL
// ==========================================================

async function makeText(
  guild,
  category,
  name
) {
  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
  });
}

// ==========================================================
// VOICE CHANNEL
// ==========================================================

async function makeVoice(
  guild,
  category,
  name
) {
  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: category.id,
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
  } catch {}
}

// ==========================================================
// WELCOME
// ==========================================================

async function sendWelcome(channel) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・welcome ૮₍˶ᵔ ᵕ ᵔ˶₎ა"
      )
      .setDescription(
        [
          "welcome to the community >ᴗ<",
          "",
          "♡ read the rules",
          "♡ verify yourself",
          "♡ meet everyone",
          "",
          "hope you enjoy your stay ౨ৎ",
        ].join("\n")
      );

  await channel.send({
    embeds: [embed],
  });
}

// ==========================================================
// RULES
// ==========================================================

async function sendRules(channel) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・rules >ᴗ<"
      )
      .setDescription(
        [
          "**01**  be respectful",
          "treat everyone with respect.",
          "",
          "**02**  no harassment",
          "no bullying, threats, or targeted harassment.",
          "",
          "**03**  no spam",
          "don't spam messages, mentions, or channels.",
          "",
          "**04**  appropriate content",
          "keep content appropriate and follow Discord's rules.",
          "",
          "**05**  privacy",
          "never share private information.",
          "",
          "**06**  use the right channels",
          "keep conversations where they belong.",
          "",
          "**07**  listen to staff",
          "follow reasonable staff instructions.",
          "",
          "**08**  have fun",
          "make friends and enjoy the community ♡",
        ].join("\n")
      )
      .setFooter({
        text: "౨ৎ community rules",
      });

  await channel.send({
    embeds: [embed],
  });
}

// ==========================================================
// VERIFY PANEL
// ==========================================================

async function sendVerify(
  channel
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・verify ૮₍˶ᵔ ᵕ ᔢ˶₎ა"
      )
      .setDescription(
        [
          "welcome >ᴗ<",
          "",
          "before entering the community,",
          "please verify yourself below.",
          "",
          "once verified, the rest of the server",
          "will become visible to you.",
          "",
          "౨ৎ click the button below",
        ].join("\n")
      );

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          "verify_member"
        )
        .setLabel("✓ verify")
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
// SELF ROLES
// ==========================================================

async function sendSelfRoles(
  channel
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・self roles ♡"
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
    ),

    new ActionRowBuilder().addComponents(
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
    ),

    new ActionRowBuilder().addComponents(
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
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          "role_announcements"
        )
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
    ),
  ];

  await channel.send({
    embeds: [embed],
    components: rows,
  });
}

// ==========================================================
// LEVEL PANEL
// ==========================================================

async function sendLevels(
  channel
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・levels >ᴗ<"
      )
      .setDescription(
        [
          "chat to earn XP ♡",
          "",
          "**level rewards**",
          "",
          "level 5",
          "level 10",
          "level 20",
          "level 30",
          "level 50",
          "",
          "use `/rank` to check your progress.",
        ].join("\n")
      );

  await channel.send({
    embeds: [embed],
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
        "౨ৎ・confessions ♡"
      )
      .setDescription(
        [
          "have something to say?",
          "",
          "send it anonymously below >ᴗ<",
        ].join("\n")
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
// TICKETS
// ==========================================================

async function sendTickets(
  channel
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "౨ৎ・tickets >ᴗ<"
      )
      .setDescription(
        [
          "need some help?",
          "",
          "click below to open a private ticket.",
          "",
          "staff will help you as soon as possible ♡",
        ].join("\n")
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
        "౨ৎ・apply ૮₍˶ᵔ ᵕ ᔢ˶₎ა"
      )
      .setDescription(
        [
          "want to help the community?",
          "",
          "click below to apply for moderator.",
          "",
          "your application will be sent to staff ♡",
        ].join("\n")
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
// REPAIR / BUILD SERVER
// ==========================================================

async function repairServer(
  guild
) {
  console.log(
    "======================================"
  );

  console.log(
    `🔧 BUILDING ${guild.name}`
  );

  console.log(
    "======================================"
  );

  // DELETE EVERYTHING
  await deleteChannels(guild);
  await deleteRoles(guild);

  // CREATE ROLES
  const roles =
    await createRoles(guild);

  // ========================================================
  // ENTERING
  // ========================================================

  const entering =
    await makeCategory(
      guild,
      "୨ৎ・entering ૮₍˶ᵔ ᵕ ᵔ˶₎ა",
      roles,
      "entering"
    );

  const welcome =
    await makeText(
      guild,
      entering,
      "╰・welcome"
    );

  const rules =
    await makeText(
      guild,
      entering,
      "╰・rules"
    );

  const verify =
    await makeText(
      guild,
      entering,
      "╰・verify"
    );

  const announcements =
    await makeText(
      guild,
      entering,
      "╰・announcements"
    );

  const updates =
    await makeText(
      guild,
      entering,
      "╰・updates"
    );

  // ========================================================
  // SOCIAL
  // ========================================================

  const social =
    await makeCategory(
      guild,
      "౨ৎ・social ૮꒰ ˶• ༝ •˶꒱ა",
      roles,
      "verified"
    );

  await makeText(
    guild,
    social,
    "୨ৎ・general-chat"
  );

  await makeText(
    guild,
    social,
    "୨ৎ・general-chat-2"
  );

  await makeText(
    guild,
    social,
    "⌞・vent-rant"
  );

  await makeText(
    guild,
    social,
    "⌞・make-friends"
  );

  await makeText(
    guild,
    social,
    "⌞・introductions"
  );

  await makeText(
    guild,
    social,
    "⌞・media"
  );

  await makeText(
    guild,
    social,
    "⌞・off-topic"
  );

  // ========================================================
  // FUN
  // ========================================================

  const fun =
    await makeCategory(
      guild,
      "౨ৎ・fun >ᴗ<",
      roles,
      "verified"
    );

  await makeText(
    guild,
    fun,
    "♡・counting"
  );

  await makeText(
    guild,
    fun,
    "♡・games"
  );

  await makeText(
    guild,
    fun,
    "♡・would-you-rather"
  );

  await makeText(
    guild,
    fun,
    "♡・daily-question"
  );

  await makeText(
    guild,
    fun,
    "♡・questions"
  );

  await makeText(
    guild,
    fun,
    "♡・hot-takes"
  );

  await makeText(
    guild,
    fun,
    "♡・compliments"
  );

  const confessions =
    await makeText(
      guild,
      fun,
      "♡・confessions"
    );

  // ========================================================
  // CREATIVE
  // ========================================================

  const creative =
    await makeCategory(
      guild,
      "୨ৎ・creative ૮₍˶ᵔ ᵕ ᵔ˶₎ა",
      roles,
      "verified"
    );

  await makeText(
    guild,
    creative,
    "୨ৎ・art"
  );

  await makeText(
    guild,
    creative,
    "୨ৎ・creations"
  );

  await makeText(
    guild,
    creative,
    "୨ৎ・edits"
  );

  await makeText(
    guild,
    creative,
    "୨ৎ・photography"
  );

  await makeText(
    guild,
    creative,
    "୨ৎ・music"
  );

  await makeText(
    guild,
    creative,
    "୨ৎ・clips"
  );

  await makeText(
    guild,
    creative,
    "୨ৎ・screenshots"
  );

  await makeText(
    guild,
    creative,
    "୨ৎ・ideas"
  );

  // ========================================================
  // COMMUNITY
  // ========================================================

  const community =
    await makeCategory(
      guild,
      "౨ৎ・community ♡",
      roles,
      "verified"
    );

  await makeText(
    guild,
    community,
    "⌞・suggestions"
  );

  await makeText(
    guild,
    community,
    "⌞・polls"
  );

  await makeText(
    guild,
    community,
    "⌞・events"
  );

  await makeText(
    guild,
    community,
    "⌞・giveaways"
  );

  await makeText(
    guild,
    community,
    "⌞・milestones"
  );

  await makeText(
    guild,
    community,
    "⌞・starboard"
  );

  // ========================================================
  // ROLES
  // ========================================================

  const roleCategory =
    await makeCategory(
      guild,
      "୨ৎ・roles ૮₍˶• . •⑅₎ა",
      roles,
      "verified"
    );

  const selfRoles =
    await makeText(
      guild,
      roleCategory,
      "╰・self-roles"
    );

  await makeText(
    guild,
    roleCategory,
    "╰・pronouns"
  );

  await makeText(
    guild,
    roleCategory,
    "╰・age-roles"
  );

  await makeText(
    guild,
    roleCategory,
    "╰・interest-roles"
  );

  await makeText(
    guild,
    roleCategory,
    "╰・notification-roles"
  );

  // ========================================================
  // PARTNERS
  // ========================================================

  const partners =
    await makeCategory(
      guild,
      "౨ৎ・partners 💘",
      roles,
      "verified"
    );

  await makeText(
    guild,
    partners,
    "୨ৎ・partner-info"
  );

  await makeText(
    guild,
    partners,
    "୨ৎ・partner-requests"
  );

  await makeText(
    guild,
    partners,
    "୨ৎ・partners"
  );

  // ========================================================
  // SUPPORT
  // ========================================================

  const support =
    await makeCategory(
      guild,
      "౨ৎ・support ૮꒰ ˶• ༝ •˶꒱ა",
      roles,
      "verified"
    );

  const tickets =
    await makeText(
      guild,
      support,
      "╰・tickets"
    );

  const applications =
    await makeText(
      guild,
      support,
      "╰・apply"
    );

  await makeText(
    guild,
    support,
    "╰・report"
  );

  await makeText(
    guild,
    support,
    "╰・help"
  );

  // ========================================================
  // BOTS
  // ========================================================

  const bots =
    await makeCategory(
      guild,
      "୨ৎ・bots ૮₍˶ᵔ ᵕ ᔢ˶₎ა",
      roles,
      "verified"
    );

  await makeText(
    guild,
    bots,
    "⌞・bot-commands"
  );

  const levelsChannel =
    await makeText(
      guild,
      bots,
      "⌞・levels"
    );

  await makeText(
    guild,
    bots,
    "⌞・leaderboard"
  );

  await makeText(
    guild,
    bots,
    "⌞・server-info"
  );

  await makeText(
    guild,
    bots,
    "⌞・swear-jar"
  );

  // ========================================================
  // CALL
  // ========================================================

  const call =
    await makeCategory(
      guild,
      "౨ৎ・call ♡",
      roles,
      "verified"
    );

  await makeVoice(
    guild,
    call,
    "୨ৎ・lounge"
  );

  await makeVoice(
    guild,
    call,
    "୨ৎ・music-vc"
  );

  await makeVoice(
    guild,
    call,
    "୨ৎ・gaming"
  );

  await makeVoice(
    guild,
    call,
    "୨ৎ・sleeping"
  );

  await makeVoice(
    guild,
    call,
    "୨ৎ・afk"
  );

  // ========================================================
  // STAFF
  // ========================================================

  const staff =
    await makeCategory(
      guild,
      "୨ৎ・staff ૮꒰ ˶• ༝ •˶꒱ა",
      roles,
      "staff"
    );

  await makeText(
    guild,
    staff,
    "⌞・staff-chat"
  );

  await makeText(
    guild,
    staff,
    "⌞・moderation"
  );

  await makeText(
    guild,
    staff,
    "⌞・reports"
  );

  await makeText(
    guild,
    staff,
    "⌞・applications"
  );

  await makeText(
    guild,
    staff,
    "⌞・staff-lounge"
  );

  await makeVoice(
    guild,
    staff,
    "⌞・staff-vc"
  );

  // ========================================================
  // LOCK INFO CHANNELS
  // ========================================================

  await lockChannel(
    rules,
    guild
  );

  await lockChannel(
    welcome,
    guild
  );

  await lockChannel(
    announcements,
    guild
  );

  await lockChannel(
    updates,
    guild
  );

  // ========================================================
  // SEND PANELS
  // ========================================================

  await sendWelcome(welcome);
  await sendRules(rules);
  await sendVerify(verify);
  await sendSelfRoles(selfRoles);
  await sendLevels(levelsChannel);
  await sendConfessions(confessions);
  await sendTickets(tickets);
  await sendApplications(applications);

  console.log(
    "======================================"
  );

  console.log(
    "✅ SERVER BUILD COMPLETE"
  );

  console.log(
    "🔐 Verification system enabled."
  );

  console.log(
    "======================================"
  );
}

// ==========================================================
// COMMANDS
// ==========================================================

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription(
      "Completely rebuild the server."
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
].map(command =>
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
        }).setToken(TOKEN);

      await rest.put(
        Routes.applicationCommands(
          client.user.id
        ),
        {
          body: commands,
        }
      );

      console.log(
        "✅ Slash commands registered."
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
  async member => {
    try {
      const roleName =
        member.user.bot
          ? "bots"
          : "member";

      const role =
        member.guild.roles.cache.find(
          r =>
            r.name === roleName
        );

      if (role) {
        await member.roles.add(
          role
        );
      }

      // IMPORTANT:
      // Do NOT give verified here.
      // They must click verify.

      const welcome =
        member.guild.channels.cache.find(
          c =>
            c.name ===
            "╰・welcome"
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
        "Join error:",
        error.message
      );
    }
  }
);

// ==========================================================
// XP
// ==========================================================

client.on(
  "messageCreate",
  async message => {
    if (!message.guild) return;
    if (message.author.bot) return;

    // Don't give XP to unverified members
    const member =
      message.member;

    if (
      !member.roles.cache.some(
        role =>
          role.name ===
          "verified"
      )
    ) {
      return;
    }

    const key =
      `${message.guild.id}:${message.author.id}`;

    if (
      xpCooldown.has(key)
    ) {
      return;
    }

    xpCooldown.add(key);

    setTimeout(
      () =>
        xpCooldown.delete(key),
      XP_COOLDOWN
    );

    const data =
      getUserData(
        message.guild.id,
        message.author.id
      );

    const oldLevel =
      getLevel(data.xp);

    const gainedXP =
      Math.floor(
        Math.random() *
          (XP_MAX - XP_MIN + 1)
      ) + XP_MIN;

    data.xp += gainedXP;

    const newLevel =
      getLevel(data.xp);

    saveLevels();

    await updateLevelRole(
      member
    );

    if (
      newLevel >
      oldLevel
    ) {
      const levelChannel =
        message.guild.channels.cache.find(
          c =>
            c.name ===
            "⌞・levels"
        );

      const target =
        levelChannel ||
        message.channel;

      await target.send(
        `🎉 ${message.author} reached **level ${newLevel}**! >ᴗ<`
      );
    }
  }
);

// ==========================================================
// INTERACTIONS
// ==========================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      // ======================================================
      // SLASH COMMANDS
      // ======================================================

      if (
        interaction.isChatInputCommand()
      ) {
        // ----------------------------------------------------
        // SETUP
        // ----------------------------------------------------

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
                "❌ You need Manage Server.",
              ephemeral: true,
            });
          }

          await interaction.deferReply({
            ephemeral: true,
          });

          try {
            await interaction.editReply(
              "🔧 Rebuilding server...\n\n🗑️ Removing old channels and roles..."
            );

            await repairServer(
              interaction.guild
            );

            await interaction.editReply(
              "✅ **Server rebuilt!**\n\n౨ৎ・Entering\n౨ৎ・Social\n౨ৎ・Fun\n౨ৎ・Creative\n౨ৎ・Community\n౨ৎ・Roles\n౨ৎ・Partners\n౨ৎ・Support\n౨ৎ・Bots\n౨ৎ・Call\n୨ৎ・Staff\n\n🔐 Members must verify before seeing the community."
            );
          } catch (error) {
            console.error(
              "REPAIR ERROR:",
              error
            );

            await interaction.editReply(
              `❌ Repair failed:\n\`${error.message}\``
            );
          }

          return;
        }

        // ----------------------------------------------------
        // RANK
        // ----------------------------------------------------

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
            getLevel(data.xp);

          const currentXP =
            xpForLevel(level);

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
                "౨ৎ・your rank >ᴗ<"
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

        // ----------------------------------------------------
        // LEADERBOARD
        // ----------------------------------------------------

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
              .slice(0, 10);

          if (
            !entries.length
          ) {
            return interaction.reply(
              "nobody has earned XP yet >ᴗ<"
            );
          }

          const lines = [];

          for (
            let i = 0;
            i < entries.length;
            i++
          ) {
            const [
              userId,
              data,
            ] = entries[i];

            const user =
              await client.users
                .fetch(userId)
                .catch(
                  () => null
                );

            if (!user) continue;

            lines.push(
              `**${i + 1}.** ${user} — level ${getLevel(data.xp)} — ${data.xp} XP`
            );
          }

          const embed =
            new EmbedBuilder()
              .setTitle(
                "౨ৎ・leaderboard ♡"
              )
              .setDescription(
                lines.join("\n")
              );

          return interaction.reply({
            embeds: [embed],
          });
        }

        // ----------------------------------------------------
        // SERVER INFO
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // CONFESS
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // HELP
        // ----------------------------------------------------

        if (
          interaction.commandName ===
          "help"
        ) {
          const embed =
            new EmbedBuilder()
              .setTitle(
                "౨ৎ・help >ᴗ<"
              )
              .setDescription(
                [
                  "`/rank` — XP and level",
                  "`/leaderboard` — XP leaderboard",
                  "`/serverinfo` — server information",
                  "`/confess` — anonymous confession",
                  "`/setup` — rebuild server",
                  "`/help` — bot help",
                  "`/restart` — restart bot",
                ].join("\n")
              );

          return interaction.reply({
            embeds: [embed],
            ephemeral: true,
          });
        }

        // ----------------------------------------------------
        // RESTART
        // ----------------------------------------------------

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

      // ======================================================
      // BUTTONS
      // ======================================================

      if (
        interaction.isButton()
      ) {
        const guild =
          interaction.guild;

        // ====================================================
        // VERIFY
        // ====================================================

        if (
          interaction.customId ===
          "verify_member"
        ) {
          const verifiedRole =
            guild.roles.cache.find(
              r =>
                r.name ===
                "verified"
            );

          if (!verifiedRole) {
            return interaction.reply({
              content:
                "❌ The verified role could not be found.",
              ephemeral: true,
            });
          }

          if (
            interaction.member.roles.cache.has(
              verifiedRole.id
            )
          ) {
            return interaction.reply({
              content:
                "you are already verified >ᴗ<",
              ephemeral: true,
            });
          }

          try {
            await interaction.member.roles.add(
              verifiedRole
            );

            return interaction.reply({
              content:
                "౨ৎ **verified!** welcome to the community >ᴗ<",
              ephemeral: true,
            });
          } catch (error) {
            console.error(
              "VERIFY ERROR:",
              error
            );

            return interaction.reply({
              content:
                "❌ I couldn't give you the verified role. Make sure my bot role is above the verified role.",
              ephemeral: true,
            });
          }
        }

        // ====================================================
        // SELF ROLES
        // ====================================================

        const roleMap = {
          role_sheher: "she/her",
          role_hehim: "he/him",
          role_theythem:
            "they/them",
          role_any:
            "any pronouns",
          role_adult: "adult",
          role_minor: "minor",
          role_artist: "artist",
          role_music: "music",
          role_anime: "anime",
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
          role_polls: "polls",
        };

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
              r =>
                r.name ===
                roleName
            );

          if (!role) {
            return interaction.reply({
              content:
                "❌ Role not found.",
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
                `removed **${roleName}** >ᴗ<`,
              ephemeral: true,
            });
          }

          await interaction.member.roles.add(
            role
          );

          return interaction.reply({
            content:
              `added **${roleName}** >ᴗ<`,
            ephemeral: true,
          });
        }

        // ====================================================
        // CONFESSION BUTTON
        // ====================================================

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

        // ====================================================
        // CREATE TICKET
        // ====================================================

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
              .slice(0, 15);

          const ticketName =
            `╰・ticket-${username}`;

          const existing =
            guild.channels.cache.find(
              channel =>
                channel.name ===
                ticketName
            );

          if (existing) {
            return interaction.reply({
              content:
                `🎫 you already have a ticket: ${existing}`,
              ephemeral: true,
            });
          }

          const category =
            guild.channels.cache.find(
              channel =>
                channel.type ===
                  ChannelType.GuildCategory &&
                channel.name ===
                  "౨ৎ・support ૮꒰ ˶• ༝ •˶꒱ა"
            );

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
                PermissionFlagsBits.AttachFiles,
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
                r =>
                  r.name ===
                  name
              );

            if (!role) continue;

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
            await guild.channels.create({
              name: ticketName,
              type:
                ChannelType.GuildText,

              parent:
                category
                  ? category.id
                  : undefined,

              permissionOverwrites:
                overwrites,
            });

          const closeRow =
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(
                  "close_ticket"
                )
                .setLabel(
                  "close ticket"
                )
                .setStyle(
                  ButtonStyle.Danger
                )
            );

          await ticket.send({
            content:
              `${interaction.user}`,

            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "౨ৎ・ticket >ᴗ<"
                )
                .setDescription(
                  [
                    `welcome ${interaction.user} ♡`,
                    "",
                    "tell staff what you need help with.",
                    "",
                    "when you're finished, close the ticket below.",
                  ].join("\n")
                ),
            ],

            components: [
              closeRow,
            ],
          });

          return interaction.reply({
            content:
              `🎫 ticket created: ${ticket}`,
            ephemeral: true,
          });
        }

        // ====================================================
        // CLOSE TICKET
        // ====================================================

        if (
          interaction.customId ===
          "close_ticket"
        ) {
          const channel =
            interaction.channel;

          if (
            !channel ||
            !channel.name.includes(
              "ticket-"
            )
          ) {
            return interaction.reply({
              content:
                "❌ this isn't a ticket.",
              ephemeral: true,
            });
          }

          await interaction.reply(
            "🔒 closing ticket..."
          );

          setTimeout(
            async () => {
              try {
                await channel.delete(
                  "Ticket closed"
                );
              } catch {}
            },
            1500
          );

          return;
        }

        // ====================================================
        // MODERATOR APPLICATION
        // ====================================================

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
              .setCustomId("why")
              .setLabel(
                "why do you want to be staff?"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
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
              .setRequired(true)
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

      // ======================================================
      // MODALS
      // ======================================================

      if (
        interaction.isModalSubmit()
      ) {
        // ----------------------------------------------------
        // CONFESSION
        // ----------------------------------------------------

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
              c =>
                c.name ===
                "♡・confessions"
            );

          if (!channel) {
            return interaction.reply({
              content:
                "❌ I can't find the confession channel.",
              ephemeral: true,
            });
          }

          try {
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
                })
                .setTimestamp();

            await channel.send({
              embeds: [embed],
            });

            return interaction.reply({
              content:
                "💭 your confession was sent anonymously! >ᴗ<",
              ephemeral: true,
            });
          } catch (error) {
            console.error(
              "CONFESSION ERROR:",
              error
            );

            return interaction.reply({
              content:
                "❌ I couldn't send the confession.",
              ephemeral: true,
            });
          }
        }

        // ----------------------------------------------------
        // APPLICATION
        // ----------------------------------------------------

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
              c =>
                c.name ===
                "╰・apply"
            );

          if (!channel) {
            return interaction.reply({
              content:
                "❌ I can't find the application channel.",
              ephemeral: true,
            });
          }

          const embed =
            new EmbedBuilder()
              .setTitle(
                "౨ৎ・new moderator application"
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
                    "why do you want to be staff?",
                  value:
                    why,
                },

                {
                  name:
                    "previous experience",
                  value:
                    experience,
                }
              )
              .setTimestamp();

          try {
            await channel.send({
              embeds: [embed],
            });

            return interaction.reply({
              content:
                "📝 your application was submitted! >ᴗ<",
              ephemeral: true,
            });
          } catch (error) {
            console.error(
              "APPLICATION ERROR:",
              error
            );

            return interaction.reply({
              content:
                "❌ I couldn't send the application.",
              ephemeral: true,
            });
          }
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