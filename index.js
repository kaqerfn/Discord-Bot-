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

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN is missing from Railway Variables.");
  process.exit(1);
}

const fs = require("fs");
const path = require("path");

// ============================================================
// LEVEL DATA
// ============================================================

const DATA_DIR = path.join(__dirname, "data");
const LEVEL_FILE = path.join(DATA_DIR, "levels.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let levelData = {};

try {
  if (fs.existsSync(LEVEL_FILE)) {
    levelData = JSON.parse(
      fs.readFileSync(LEVEL_FILE, "utf8")
    );
  }
} catch (error) {
  console.error("⚠️ Could not read levels.json.");
}

function saveLevels() {
  try {
    fs.writeFileSync(
      LEVEL_FILE,
      JSON.stringify(levelData, null, 2)
    );
  } catch (error) {
    console.error(
      "❌ Could not save levels:",
      error.message
    );
  }
}

function getData(guildId, userId) {
  if (!levelData[guildId]) {
    levelData[guildId] = {};
  }

  if (!levelData[guildId][userId]) {
    levelData[guildId][userId] = {
      xp: 0,
    };
  }

  return levelData[guildId][userId];
}

function xpNeeded(level) {
  return 100 + level * 50;
}

function levelInfo(totalXP) {
  let level = 0;
  let xp = Math.max(0, Number(totalXP) || 0);

  while (xp >= xpNeeded(level)) {
    xp -= xpNeeded(level);
    level++;
  }

  return {
    level,
    xp,
    needed: xpNeeded(level),
  };
}

// ============================================================
// CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = ">ᴗ<・";

const XP_COOLDOWN = new Map();

// ============================================================
// ROLE NAMES
// ============================================================

const ROLE_NAMES = {
  owner: "👑 • owner",
  coowner: "💎 • co-owner",
  admin: "🔴 • admin",
  moderator: "🛡️ • moderator",
  staff: "🔨 • staff",
  support: "🎫 • support",

  member: "👤 • member",
  bots: "🤖 • bots",

  sheher: "❤️ • she/her",
  hehim: "💙 • he/him",
  theythem: "🖤 • they/them",
  any: "💚 • any pronouns",

  adult: "🧑 • adult",
  minor: "🔞 • minor",

  artist: "🎨 • artist",
  music: "🎹 • music",
  anime: "🌝 • anime",

  introvert: "👤 • introvert",
  extrovert: "🫂 • extrovert",

  announcements: "📣 • announcements",
  events: "🎫 • events",
  giveaways: "🫡 • giveaways",
  polls: "🐻‍❄️ • polls",

  level5: "⭐ • level 5",
  level10: "🌟 • level 10",
  level20: "💫 • level 20",
  level30: "🔥 • level 30",
  level50: "👑 • level 50",
};

// ============================================================
// SELF ROLES
// ============================================================

const SELF_ROLE_KEYS = [
  "sheher",
  "hehim",
  "theythem",
  "any",
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
];

const SELF_ROLE_LABELS = {
  sheher: "❤️ she/her",
  hehim: "💙 he/him",
  theythem: "🖤 they/them",
  any: "💚 any pronouns",

  adult: "🧑 adult",
  minor: "🔞 minor",

  artist: "🎨 artist",
  music: "🎹 music",
  anime: "🌝 anime",

  introvert: "👤 introvert",
  extrovert: "🫂 extrovert",

  announcements: "📣 announcements",
  events: "🎫 events",
  giveaways: "🫡 giveaways",
  polls: "🐻‍❄️ polls",
};

// ============================================================
// LEVEL REWARDS
// ============================================================

const LEVEL_REWARDS = [
  ["level5", 5, 0xf1c40f],
  ["level10", 10, 0xffd700],
  ["level20", 20, 0x9b59b6],
  ["level30", 30, 0xe74c3c],
  ["level50", 50, 0x5865f2],
];

// ============================================================
// SERVER STRUCTURE
// ============================================================

const STRUCTURE = [
  {
    name: "001 • INFO",
    locked: true,

    channels: [
      "rules",
      "announcements",
      "welcome",
      "goodbye",
      "introductions",
      "boosts",
      "partnerships",
      "self-roles",
    ],
  },

  {
    name: "002 • COMMUNITY",

    channels: [
      "chat",
      "make-friends",
      "media",
      "memes",
    ],
  },

  {
    name: "003 • EXTRAS",

    channels: [
      "levels",
      "starboard",
      "confessions",
      "support",
    ],
  },

  {
    name: "004 • VC",

    channels: [
      {
        name: "VC",
        type: "voice",
      },
    ],
  },

  {
    name: "005 • STAFF",

    staffOnly: true,

    channels: [
      {
        name: "staff-vc",
        type: "voice",
      },
    ],
  },
];

// ============================================================
// CHANNEL CONTENT
// ============================================================

const CONTENT = {
  rules: [
    "📜 SERVER RULES",

    "**01 — Respect**\n" +
      "Treat everyone with respect. No harassment, bullying, threats, or targeted hate.\n\n" +

      "**02 — No spam**\n" +
      "Do not flood chat, spam mentions, or disrupt the server.\n\n" +

      "**03 — Keep it appropriate**\n" +
      "Follow Discord Terms of Service and keep content appropriate.\n\n" +

      "**04 — No unsolicited advertising**\n" +
      "Use the proper partnership process.\n\n" +

      "**05 — Protect privacy**\n" +
      "Never post private information.\n\n" +

      "**06 — Use the right channels**\n" +
      "Keep conversations where they belong.\n\n" +

      "**07 — Staff**\n" +
      "Use `9Є • support` if you need help.",
  ],

  announcements: [
    "📣 ANNOUNCEMENTS",

    "Official **Make Friends | Community** announcements are posted here.\n\n" +
      "Choose **📣 announcements** in self-roles if you want notifications.",
  ],

  welcome: [
    "👋 WELCOME",

    "Welcome to **Make Friends | Community**! 🫂\n\n" +
      "Read the rules, choose your roles, and meet everyone.\n\n" +
      "➡️ `9Є • rules`\n" +
      "➡️ `9Є • self-roles`\n" +
      "➡️ `9Є • chat`",
  ],

  goodbye: [
    "👋 GOODBYE",

    "Goodbye messages for members leaving the community appear here.",
  ],

  introductions: [
    "🫂 INTRODUCTIONS",

    "Introduce yourself!\n\n" +
      "Share your nickname, interests, games, music, hobbies, or anything you are comfortable sharing.\n\n" +
      "⚠️ Never post private information.",
  ],

  boosts: [
    "🚀 SERVER BOOSTS",

    "Thank you to everyone who boosts **Make Friends | Community**! 💜",
  ],

  partnerships: [
    "🤝 PARTNERSHIPS",

    "For partnership requests, contact staff through `9Є • support`.",
  ],

  "self-roles": [
    "🎭 SELF ROLES",

    "**PRONOUNS**\n" +
      "❤️ she/her • 💙 he/him • 🖤 they/them • 💚 any pronouns\n\n" +

      "**AGE**\n" +
      "🧑 adult • 🔞 minor\n\n" +

      "**INTERESTS**\n" +
      "🎨 artist • 🎹 music • 🌝 anime\n\n" +

      "**PERSONALITY**\n" +
      "👤 introvert • 🫂 extrovert\n\n" +

      "**NOTIFICATIONS**\n" +
      "📣 announcements • 🎫 events • 🫡 giveaways • 🐻‍❄️ polls\n\n" +

      "Tap a button to add or remove a role.",
  ],

  chat: [
    "💬 CHAT",

    "The main community chat.\n\n" +
      "Meet people, talk, joke around, and have normal conversations.",
  ],

  "make-friends": [
    "🫂 MAKE FRIENDS",

    "Looking for people to talk to?\n\n" +
      "Share your interests and find people with similar interests.",
  ],

  media: [
    "🖼️ MEDIA",

    "Share appropriate pictures, artwork, edits, screenshots, and clips.",
  ],

  memes: [
    "😂 MEMES",

    "Post your funniest memes here.",
  ],

  levels: [
    "⭐ LEVELS",

    "Chat to earn XP and level up!\n\n" +
      "⭐ `/rank` — your level\n" +
      "🏆 `/leaderboard` — top XP\n\n" +

      "**REWARDS**\n" +
      "⭐ Level 5\n" +
      "🌟 Level 10\n" +
      "💫 Level 20\n" +
      "🔥 Level 30\n" +
      "👑 Level 50",
  ],

  starboard: [
    "⭐ STARBOARD",

    "Featured community messages can appear here.",
  ],

  confessions: [
    "🤫 ANONYMOUS CONFESSIONS",

    "Use **/confess** to submit an anonymous confession.\n\n" +
      "Your public post does not show your Discord username, tag, avatar, or ID.\n\n" +
      "⚠️ Anonymous does not exempt anyone from the server rules.",
  ],

  support: [
    "🆘 SUPPORT",

    "Need help?\n\n" +
      "Explain the issue here and staff can help.\n\n" +
      "For private matters, contact staff.",
  ],
};

// ============================================================
// CREATE ROLE
// ============================================================

async function getOrCreateRole(
  guild,
  name,
  options = {}
) {
  let role = guild.roles.cache.find(
    (r) => r.name === name
  );

  if (!role) {
    role = await guild.roles.create({
      name,
      ...options,
      reason: "Automatic community setup",
    });
  }

  return role;
}

// ============================================================
// CREATE ALL ROLES
// ============================================================

async function ensureRoles(guild) {
  const roles = {};

  const mainRoles = [
    ["owner", 0xf1c40f, true],
    ["coowner", 0xe67e22, true],
    ["admin", 0xe74c3c, true],
    ["moderator", 0x3498db, true],
    ["staff", 0x9b59b6, true],
    ["support", 0x2ecc71, true],

    ["member", 0x95a5a6, false],
    ["bots", 0x7289da, false],
  ];

  for (const [key, color, hoist] of mainRoles) {
    roles[key] = await getOrCreateRole(
      guild,
      ROLE_NAMES[key],
      {
        color,
        hoist,
      }
    );
  }

  const colors = {
    sheher: 0xff69b4,
    hehim: 0x3498db,
    theythem: 0x2ecc71,
    any: 0x57f287,

    adult: 0x95a5a6,
    minor: 0xe74c3c,

    artist: 0x9b59b6,
    music: 0x1abc9c,
    anime: 0xe91e63,

    introvert: 0x7289da,
    extrovert: 0xf1c40f,

    announcements: 0xfee75c,
    events: 0xeb459e,
    giveaways: 0x57f287,
    polls: 0x5865f2,
  };

  for (const key of SELF_ROLE_KEYS) {
    roles[key] = await getOrCreateRole(
      guild,
      ROLE_NAMES[key],
      {
        color: colors[key],
      }
    );
  }

  for (const [key, level, color] of LEVEL_REWARDS) {
    roles[key] = await getOrCreateRole(
      guild,
      ROLE_NAMES[key],
      {
        color,
      }
    );
  }

  return roles;
}

// ============================================================
// CHANNEL PERMISSIONS
// ============================================================

function textOverwrites(
  guild,
  roles,
  locked
) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
      ],

      deny: locked
        ? [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.CreatePrivateThreads,
          ]
        : [],
    },
  ];

  const staffRoles = [
    roles.owner,
    roles.coowner,
    roles.admin,
    roles.moderator,
    roles.staff,
    roles.support,
  ];

  for (const role of staffRoles) {
    overwrites.push({
      id: role.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  if (client.user) {
    overwrites.push({
      id: client.user.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  return overwrites;
}

// ============================================================
// STAFF VOICE PERMISSIONS
// ============================================================

function staffVoiceOverwrites(
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
    roles.owner,
    roles.coowner,
    roles.admin,
    roles.moderator,
    roles.staff,
  ];

  for (const role of staffRoles) {
    overwrites.push({
      id: role.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ],
    });
  }

  return overwrites;
}

// ============================================================
// SELF ROLE BUTTONS
// ============================================================

function selfRoleComponents(roles) {
  const rows = [
    [
      "sheher",
      "hehim",
      "theythem",
      "any",
      "adult",
    ],

    [
      "minor",
      "artist",
      "music",
      "anime",
      "introvert",
    ],

    [
      "extrovert",
      "announcements",
      "events",
      "giveaways",
      "polls",
    ],
  ];

  return rows.map((row) =>
    new ActionRowBuilder().addComponents(
      row.map(
        (key) =>
          new ButtonBuilder()
            .setCustomId(
              `selfrole:${roles[key].id}`
            )
            .setLabel(
              SELF_ROLE_LABELS[key]
            )
            .setStyle(
              ButtonStyle.Secondary
            )
      )
    )
  );
}

// ============================================================
// CATEGORY
// ============================================================

async function getOrCreateCategory(
  guild,
  name
) {
  let category =
    guild.channels.cache.find(
      (channel) =>
        channel.type ===
          ChannelType.GuildCategory &&
        channel.name === name
    );

  if (!category) {
    category =
      await guild.channels.create({
        name,
        type: ChannelType.GuildCategory,
        reason:
          "Automatic community setup",
      });
  }

  return category;
}

// ============================================================
// CHANNEL
// ============================================================

async function getOrCreateChannel(
  guild,
  name,
  type,
  parent,
  overwrites
) {
  const discordType =
    type === "voice"
      ? ChannelType.GuildVoice
      : ChannelType.GuildText;

  let channel =
    guild.channels.cache.find(
      (c) =>
        c.name === name &&
        c.type === discordType &&
        c.parentId === parent.id
    );

  if (!channel) {
    channel =
      await guild.channels.create({
        name,
        type: discordType,
        parent: parent.id,
        permissionOverwrites:
          overwrites,
        reason:
          "Automatic community setup",
      });
  }

  return channel;
}

// ============================================================
// EMBED
// ============================================================

function makeEmbed(key) {
  const data = CONTENT[key];

  if (!data) {
    return null;
  }

  return new EmbedBuilder()
    .setTitle(data[0])
    .setDescription(data[1])
    .setFooter({
      text: "Make Friends | Community",
    })
    .setTimestamp();
}

// ============================================================
// SEED CHANNEL
// ============================================================

async function seedChannel(
  channel,
  key,
  roles
) {
  if (
    !CONTENT[key] ||
    channel.type !== ChannelType.GuildText
  ) {
    return;
  }

  const messages =
    await channel.messages
      .fetch({
        limit: 20,
      })
      .catch(() => null);

  if (!messages) {
    return;
  }

  const alreadyPosted =
    messages.some(
      (message) =>
        message.author.id ===
          client.user.id &&
        message.embeds.length > 0
    );

  if (alreadyPosted) {
    return;
  }

  const embed = makeEmbed(key);

  if (!embed) {
    return;
  }

  if (key === "self-roles") {
    await channel
      .send({
        embeds: [embed],
        components:
          selfRoleComponents(roles),
      })
      .catch(() => {});

    return;
  }

  await channel
    .send({
      embeds: [embed],
    })
    .catch(() => {});
}

// ============================================================
// FULL SERVER SETUP
// ============================================================

async function setupGuild(guild) {
  console.log(
    `⚙️ Setting up ${guild.name}`
  );

  const roles =
    await ensureRoles(guild);

  // Give server owner owner role.
  const owner =
    await guild.members
      .fetch(guild.ownerId)
      .catch(() => null);

  if (owner) {
    await owner.roles
      .add(roles.owner)
      .catch(() => {});
  }

  // Give bot bot role.
  const me = guild.members.me;

  if (me) {
    await me.roles
      .add(roles.bots)
      .catch(() => {});
  }

  for (
    let i = 0;
    i < STRUCTURE.length;
    i++
  ) {
    const section = STRUCTURE[i];

    const category =
      await getOrCreateCategory(
        guild,
        section.name
      );

    await category
      .setPosition(i)
      .catch(() => {});

    // Lock staff category.
    if (section.staffOnly) {
      await category.permissionOverwrites
        .set(
          staffVoiceOverwrites(
            guild,
            roles
          )
        )
        .catch(() => {});
    }

    for (const raw of section.channels) {
      const definition =
        typeof raw === "string"
          ? {
              name: raw,
              type: "text",
            }
          : raw;

      const fullName =
        `${PREFIX} ${definition.name}`;

      let overwrites;

      if (section.staffOnly) {
        overwrites =
          staffVoiceOverwrites(
            guild,
            roles
          );
      } else {
        overwrites =
          textOverwrites(
            guild,
            roles,
            !!section.locked
          );
      }

      const channel =
        await getOrCreateChannel(
          guild,
          fullName,
          definition.type,
          category,
          overwrites
        );

      await channel.permissionOverwrites
        .set(overwrites)
        .catch(() => {});

      if (
        definition.type === "text"
      ) {
        await seedChannel(
          channel,
          definition.name,
          roles
        );
      }
    }
  }

  const welcome =
    guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.name ===
          `${PREFIX} welcome`
    );

  if (welcome) {
    await guild
      .setSystemChannel(welcome)
      .catch(() => {});
  }

  console.log(
    `✅ Finished ${guild.name}`
  );
}

// ============================================================
// SLASH COMMANDS
// ============================================================

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("confess")
      .setDescription(
        "Send an anonymous confession."
      ),

    new SlashCommandBuilder()
      .setName("rank")
      .setDescription(
        "View your level and XP."
      )
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription(
            "View another member."
          )
          .setRequired(false)
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
      .setName("setup")
      .setDescription(
        "Create or repair the server."
      )
      .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageGuild.toString()
      ),

    new SlashCommandBuilder()
      .setName("help")
      .setDescription(
        "Show bot commands."
      ),
  ].map((command) =>
    command.toJSON()
  );

  const rest = new REST({
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
}

// ============================================================
// CONFESSION MODAL
// ============================================================

function confessionModal() {
  const input =
    new TextInputBuilder()
      .setCustomId(
        "confession_text"
      )
      .setLabel(
        "Your confession"
      )
      .setPlaceholder(
        "Write your confession here..."
      )
      .setStyle(
        TextInputStyle.Paragraph
      )
      .setMinLength(1)
      .setMaxLength(1000)
      .setRequired(true);

  return new ModalBuilder()
    .setCustomId(
      "makefriends_confession"
    )
    .setTitle(
      "🤫 Anonymous Confession"
    )
    .addComponents(
      new ActionRowBuilder().addComponents(
        input
      )
    );
}

// ============================================================
// CONFESSION CHANNEL
// ============================================================

async function getConfessionChannel(
  guild
) {
  return guild.channels.cache.find(
    (channel) =>
      channel.type ===
        ChannelType.GuildText &&
      channel.name ===
        `${PREFIX} confessions`
  );
}

// ============================================================
// READY
// ============================================================

client.once(
  "ready",
  async () => {
    console.log(
      `✅ Logged in as ${client.user.tag}`
    );

    client.user.setPresence({
      activities: [
        {
          name:
            "Make Friends | Community",
          type: ActivityType.Watching,
        },
      ],

      status: "online",
    });

    await registerCommands();

    for (const guild of client.guilds.cache.values()) {
      await setupGuild(guild).catch(
        (error) => {
          console.error(
            `❌ Setup failed in ${guild.name}:`,
            error
          );
        }
      );
    }
  }
);

// ============================================================
// BOT ADDED TO SERVER
// ============================================================

client.on(
  "guildCreate",
  async (guild) => {
    console.log(
      `➕ Bot added to ${guild.name}`
    );

    await setupGuild(guild).catch(
      (error) => {
        console.error(
          "❌ New server setup failed:",
          error
        );
      }
    );
  }
);

// ============================================================
// NEW MEMBER
// ============================================================

client.on(
  "guildMemberAdd",
  async (member) => {
    const roleName =
      member.user.bot
        ? ROLE_NAMES.bots
        : ROLE_NAMES.member;

    const role =
      member.guild.roles.cache.find(
        (r) => r.name === roleName
      );

    if (role) {
      await member.roles
        .add(role)
        .catch(() => {});
    }

    if (!member.user.bot) {
      const welcome =
        member.guild.channels.cache.find(
          (channel) =>
            channel.type ===
              ChannelType.GuildText &&
            channel.name ===
              `${PREFIX} welcome`
        );

      if (welcome) {
        await welcome
          .send(
            `👋 Welcome <@${member.id}> to **${member.guild.name}**!`
          )
          .catch(() => {});
      }
    }
  }
);

// ============================================================
// LEVELING
// ============================================================

client.on(
  "messageCreate",
  async (message) => {
    if (
      !message.guild ||
      message.author.bot
    ) {
      return;
    }

    const key =
      `${message.guild.id}:${message.author.id}`;

    const now = Date.now();

    const last =
      XP_COOLDOWN.get(key) || 0;

    // XP once every 60 seconds.
    if (
      now - last < 60000
    ) {
      return;
    }

    XP_COOLDOWN.set(
      key,
      now
    );

    const data =
      getData(
        message.guild.id,
        message.author.id
      );

    const before =
      levelInfo(data.xp).level;

    // 15–25 XP.
    const gained =
      Math.floor(
        Math.random() * 11
      ) + 15;

    data.xp += gained;

    const after =
      levelInfo(data.xp).level;

    saveLevels();

    if (after <= before) {
      return;
    }

    const roles =
      await ensureRoles(
        message.guild
      );

    let reward = null;

    for (
      const [keyName, level] of
      LEVEL_REWARDS
    ) {
      if (after >= level) {
        reward = roles[keyName];
      }
    }

    if (
      reward &&
      !message.member.roles.cache.has(
        reward.id
      )
    ) {
      await message.member.roles
        .add(reward)
        .catch(() => {});
    }

    // Remove older level reward roles.
    for (
      const [keyName] of
      LEVEL_REWARDS
    ) {
      const role = roles[keyName];

      if (
        role &&
        role.id !== reward?.id &&
        message.member.roles.cache.has(
          role.id
        )
      ) {
        await message.member.roles
          .remove(role)
          .catch(() => {});
      }
    }

    const levelsChannel =
      message.guild.channels.cache.find(
        (channel) =>
          channel.type ===
            ChannelType.GuildText &&
          channel.name ===
            `${PREFIX} levels`
      );

    if (levelsChannel) {
      await levelsChannel
        .send({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "🎉 LEVEL UP!"
              )
              .setDescription(
                `${message.author} reached **Level ${after}**!` +
                  (reward
                    ? `\n🎁 You unlocked **${reward.name}**!`
                    : "")
              )
              .setThumbnail(
                message.author.displayAvatarURL()
              )
              .setFooter({
                text:
                  "Keep chatting to level up!",
              })
              .setTimestamp(),
          ],
        })
        .catch(() => {});
    }
  }
);

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
  "interactionCreate",
  async (interaction) => {
    try {
      // ======================================================
      // SLASH COMMANDS
      // ======================================================

      if (
        interaction.isChatInputCommand()
      ) {
        // ----------------------------------------------------
        // HELP
        // ----------------------------------------------------

        if (
          interaction.commandName ===
          "help"
        ) {
          return interaction.reply({
            ephemeral: true,

            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🤖 MAKE FRIENDS BOT"
                )
                .setDescription(
                  "🤫 `/confess` — anonymous confession\n\n" +
                    "⭐ `/rank` — your level\n\n" +
                    "🏆 `/leaderboard` — XP leaderboard\n\n" +
                    "ℹ️ `/serverinfo` — server information\n\n" +
                    "⚙️ `/setup` — repair server"
                )
                .setFooter({
                  text:
                    "Make Friends | Community",
                }),
            ],
          });
        }

        // ----------------------------------------------------
        // CONFESS
        // ----------------------------------------------------

        if (
          interaction.commandName ===
          "confess"
        ) {
          const channel =
            await getConfessionChannel(
              interaction.guild
            );

          if (!channel) {
            return interaction.reply({
              content:
                "❌ `9Є • confessions` does not exist. Use `/setup`.",
              ephemeral: true,
            });
          }

          return interaction.showModal(
            confessionModal()
          );
        }

        // ----------------------------------------------------
        // RANK
        // ----------------------------------------------------

        if (
          interaction.commandName ===
          "rank"
        ) {
          const target =
            interaction.options.getUser(
              "user"
            ) ||
            interaction.user;

          const data =
            getData(
              interaction.guild.id,
              target.id
            );

          const info =
            levelInfo(data.xp);

          const percent =
            Math.floor(
              (info.xp /
                info.needed) *
                100
            );

          const filled =
            Math.round(
              (percent / 100) * 12
            );

          const bar =
            "▰".repeat(filled) +
            "▱".repeat(
              12 - filled
            );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name:
                    `${target.username}'s Level`,
                  iconURL:
                    target.displayAvatarURL(),
                })

                .setDescription(
                  `⭐ **Level:** ${info.level}\n` +
                    `✨ **XP:** ${info.xp} / ${info.needed}\n\n` +
                    `${bar} **${percent}%**`
                )

                .setFooter({
                  text:
                    "Chat to earn XP • Make Friends | Community",
                }),
            ],
          });
        }

        // ----------------------------------------------------
        // LEADERBOARD
        // ----------------------------------------------------

        if (
          interaction.commandName ===
          "leaderboard"
        ) {
          const entries =
            Object.entries(
              levelData[
                interaction.guild.id
              ] || {}
            )
              .map(
                ([userId, data]) => ({
                  userId,

                  xp:
                    Number(
                      data.xp
                    ) || 0,
                })
              )

              .sort(
                (a, b) =>
                  b.xp - a.xp
              )

              .slice(0, 10);

          if (!entries.length) {
            return interaction.reply({
              content:
                "⭐ Nobody has earned XP yet!",
              ephemeral: true,
            });
          }

          const lines = [];

          for (
            let i = 0;
            i < entries.length;
            i++
          ) {
            const entry =
              entries[i];

            const user =
              await client.users
                .fetch(entry.userId)
                .catch(() => null);

            if (user) {
              lines.push(
                `**${i + 1}.** ${user} — **Level ${levelInfo(entry.xp).level}** • ${entry.xp.toLocaleString()} XP`
              );
            }
          }

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🏆 XP LEADERBOARD"
                )
                .setDescription(
                  lines.join("\n") ||
                    "No members found."
                ),
            ],
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

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  `ℹ️ ${guild.name}`
                )
                .setThumbnail(
                  guild.iconURL()
                )
                .addFields(
                  {
                    name:
                      "👥 Members",
                    value:
                      String(
                        guild.memberCount
                      ),
                    inline: true,
                  },

                  {
                    name:
                      "💬 Channels",
                    value:
                      String(
                        guild.channels.cache.size
                      ),
                    inline: true,
                  },

                  {
                    name:
                      "🎭 Roles",
                    value:
                      String(
                        guild.roles.cache.size
                      ),
                    inline: true,
                  }
                ),
            ],
          });
        }

        // ----------------------------------------------------
        // SETUP
        // ----------------------------------------------------

        if (
          interaction.commandName ===
          "setup"
        ) {
          if (
            !interaction.memberPermissions?.has(
              PermissionFlagsBits.ManageGuild
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need **Manage Server**.",
              ephemeral: true,
            });
          }

          await interaction.deferReply({
            ephemeral: true,
          });

          await setupGuild(
            interaction.guild
          );

          return interaction.editReply(
            "✅ Server setup repaired successfully."
          );
        }
      }

      // ======================================================
      // SELF ROLE BUTTONS
      // ======================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "selfrole:"
        )
      ) {
        const roleId =
          interaction.customId.slice(
            9
          );

        const role =
          interaction.guild.roles.cache.get(
            roleId
          );

        if (!role) {
          return interaction.reply({
            content:
              "❌ That role no longer exists.",
            ephemeral: true,
          });
        }

        const adult =
          interaction.guild.roles.cache.find(
            (r) =>
              r.name ===
              ROLE_NAMES.adult
          );

        const minor =
          interaction.guild.roles.cache.find(
            (r) =>
              r.name ===
              ROLE_NAMES.minor
          );

        // Age roles are mutually exclusive.
        if (
          role.id === adult?.id ||
          role.id === minor?.id
        ) {
          const other =
            role.id === adult?.id
              ? minor
              : adult;

          if (
            other &&
            interaction.member.roles.cache.has(
              other.id
            )
          ) {
            await interaction.member.roles
              .remove(other)
              .catch(() => {});
          }
        }

        // Remove role if already selected.
        if (
          interaction.member.roles.cache.has(
            role.id
          )
        ) {
          await interaction.member.roles
            .remove(role)
            .catch(() => {});

          return interaction.reply({
            content:
              `➖ Removed ${role}.`,
            ephemeral: true,
          });
        }

        // Add role.
        await interaction.member.roles
          .add(role)
          .catch(() => {});

        return interaction.reply({
          content:
            `➕ Added ${role}.`,
          ephemeral: true,
        });
      }

      // ======================================================
      // CONFESSION MODAL
      // ======================================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          "makefriends_confession"
      ) {
        const channel =
          await getConfessionChannel(
            interaction.guild
          );

        if (!channel) {
          return interaction.reply({
            content:
              "❌ Confession channel is missing.",
            ephemeral: true,
          });
        }

        const confession =
          interaction.fields
            .getTextInputValue(
              "confession_text"
            )
            .trim();

        if (!confession) {
          return interaction.reply({
            content:
              "❌ Your confession cannot be empty.",
            ephemeral: true,
          });
        }

        const embed =
          new EmbedBuilder()
            .setAuthor({
              name:
                "🤫 Anonymous Confession",
            })

            .setDescription(
              confession
            )

            .setFooter({
              text:
                "Anonymous • Make Friends | Community",
            })

            .setTimestamp();

        await channel.send({
          embeds: [embed],

          allowedMentions: {
            parse: [],
          },
        });

        return interaction.reply({
          content:
            "✅ Your confession was posted anonymously.",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error(
        "❌ Interaction error:",
        error
      );

      if (
        interaction.deferred ||
        interaction.replied
      ) {
        await interaction
          .followUp({
            content:
              "❌ Something went wrong.",
            ephemeral: true,
          })
          .catch(() => {});
      } else {
        await interaction
          .reply({
            content:
              "❌ Something went wrong.",
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  }
);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);