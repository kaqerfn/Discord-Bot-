// ============================================================
// MAKE FRIENDS | COMMUNITY
// Discord.js v14 — Railway ready
// ============================================================

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
  ActivityType
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const LEVEL_FILE = path.join(DATA_DIR, "levels.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let levelData = {};

try {
  levelData = fs.existsSync(LEVEL_FILE)
    ? JSON.parse(fs.readFileSync(LEVEL_FILE, "utf8"))
    : {};
} catch {
  levelData = {};
}

function saveLevels() {
  try {
    fs.writeFileSync(
      LEVEL_FILE,
      JSON.stringify(levelData, null, 2)
    );
  } catch (error) {
    console.error("❌ Could not save level data:", error);
  }
}

function getUserLevelData(guildId, userId) {
  if (!levelData[guildId]) {
    levelData[guildId] = {};
  }

  if (!levelData[guildId][userId]) {
    levelData[guildId][userId] = {
      xp: 0,
      level: 0
    };
  }

  return levelData[guildId][userId];
}

function xpNeeded(level) {
  return 100 + level * 50;
}

function levelFromTotalXP(xp) {
  let level = 0;
  let remaining = xp;

  while (remaining >= xpNeeded(level)) {
    remaining -= xpNeeded(level);
    level++;
  }

  return {
    level,
    xp: remaining,
    needed: xpNeeded(level)
  };
}

const XP_COOLDOWN = new Map();

const LEVEL_REWARDS = [
  {
    level: 5,
    name: "⭐ • level 5"
  },
  {
    level: 10,
    name: "🌟 • level 10"
  },
  {
    level: 20,
    name: "💫 • level 20"
  },
  {
    level: 30,
    name: "🔥 • level 30"
  },
  {
    level: 50,
    name: "👑 • level 50"
  }
];

async function ensureLevelRoles(guild) {
  const roles = [];

  for (const reward of LEVEL_REWARDS) {
    let role = guild.roles.cache.find(
      r => r.name === reward.name
    );

    if (!role) {
      role = await guild.roles.create({
        name: reward.name,
        color: 0x5865F2,
        reason: "Make Friends level reward"
      }).catch(() => null);
    }

    if (role) {
      roles.push({
        ...reward,
        role
      });
    }
  }

  return roles;
}

async function giveLevelRewards(member, level) {
  const rewards = await ensureLevelRoles(member.guild);

  let highest = null;

  for (const reward of rewards) {
    if (level >= reward.level) {
      highest = reward;
    }
  }

  if (!highest) {
    return null;
  }

  for (const reward of rewards) {
    if (
      reward.role.id !== highest.role.id &&
      member.roles.cache.has(reward.role.id)
    ) {
      await member.roles.remove(
        reward.role
      ).catch(() => {});
    }
  }

  if (!member.roles.cache.has(highest.role.id)) {
    await member.roles.add(
      highest.role
    ).catch(() => {});
  }

  return highest.role;
}

if (!TOKEN) {
  console.error(
    "❌ TOKEN is missing from Railway Variables."
  );

  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "9Є •";

// ============================================================
// ROLES
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
  polls: "🐻‍❄️ • polls"
};

// ============================================================
// SERVER STRUCTURE
// ============================================================

const STRUCTURE = [
  {
    name: "001 • INFO",
    channels: [
      "rules",
      "announcements",
      "welcome",
      "goodbye",
      "introductions",
      "boosts",
      "partnerships",
      "self-roles"
    ]
  },

  {
    name: "002 • COMMUNITY",
    channels: [
      "chat",
      "make-friends",
      "media",
      "memes"
    ]
  },

  {
    name: "003 • EXTRAS",
    channels: [
      "levels",
      "starboard",
      "confessions",
      "support"
    ]
  },

  {
    name: "004 • VC",
    channels: [
      {
        name: "VC",
        type: "voice"
      }
    ]
  },

  {
    name: "005 • STAFF",
    staffOnly: true,
    channels: [
      {
        name: "staff-vc",
        type: "voice"
      }
    ]
  }
];

// ============================================================
// LOCKED INFORMATION CHANNELS
// ============================================================

const LOCKED_CHANNELS = new Set([
  "rules",
  "announcements",
  "welcome",
  "goodbye",
  "introductions",
  "boosts",
  "partnerships",
  "self-roles"
]);

// ============================================================
// CHANNEL CONTENT
// ============================================================

const TEXT_CONTENT = {
  rules: {
    title: "📜 SERVER RULES",
    description:
      "Welcome to **Make Friends | Community**.\n\n" +

      "**01 — Respect**\n" +
      "Treat everyone with respect. No harassment, bullying, threats, or targeted hate.\n\n" +

      "**02 — No spam**\n" +
      "Do not flood chat, spam mentions, or intentionally disrupt the server.\n\n" +

      "**03 — Keep it appropriate**\n" +
      "Follow Discord's Terms of Service and keep content appropriate for the channel.\n\n" +

      "**04 — No unsolicited advertising**\n" +
      "Do not advertise in normal channels. Use the appropriate partnership process.\n\n" +

      "**05 — Protect privacy**\n" +
      "Never post private information belonging to yourself or someone else.\n\n" +

      "**06 — Use the right channels**\n" +
      "Keep conversations in the channels made for them.\n\n" +

      "**07 — Staff**\n" +
      "If you need help, use `9Є • support` or contact staff.\n\n" +

      "By participating in the server, you agree to follow these rules."
  },

  announcements: {
    title: "📣 ANNOUNCEMENTS",
    description:
      "Official **Make Friends | Community** announcements are posted here.\n\n" +
      "Want notifications? Choose **📣 • announcements** in `9Є • self-roles`."
  },

  welcome: {
    title: "👋 WELCOME",
    description:
      "Welcome to **Make Friends | Community**! 🫂\n\n" +

      "Make friends, meet new people, share your interests, and enjoy the community.\n\n" +

      "➡️ Read `9Є • rules`\n" +
      "➡️ Choose roles in `9Є • self-roles`\n" +
      "➡️ Introduce yourself in `9Є • introductions`\n" +
      "➡️ Start chatting in `9Є • chat`"
  },

  goodbye: {
    title: "👋 GOODBYE",
    description:
      "Goodbye messages for members leaving the community can appear here.\n\n" +
      "This channel is intentionally locked so the feed stays clean."
  },

  introductions: {
    title: "🫂 INTRODUCTIONS",
    description:
      "Introduce yourself to everyone!\n\n" +

      "You can include your nickname, interests, games, music, hobbies, or anything else you're comfortable sharing.\n\n" +

      "⚠️ Never post passwords, your home address, or other private information."
  },

  boosts: {
    title: "🚀 SERVER BOOSTS",
    description:
      "Thank you to everyone who boosts **Make Friends | Community**! 💜\n\n" +
      "Boosting supports the community and helps unlock Discord server perks."
  },

  partnerships: {
    title: "🤝 PARTNERSHIPS",
    description:
      "For partnership requests, contact staff through `9Є • support`.\n\n" +
      "Only approved partnerships should be posted here."
  },

  "self-roles": {
    title: "🎭 SELF ROLES",
    description:
      "**PRONOUNS**\n" +
      "❤️ she/her\n" +
      "💙 he/him\n" +
      "🖤 they/them\n" +
      "💚 any pronouns\n\n" +

      "**AGE**\n" +
      "🧑 adult\n" +
      "🔞 minor\n\n" +

      "**INTERESTS**\n" +
      "🎨 artist\n" +
      "🎹 music\n" +
      "🌝 anime\n\n" +

      "**PERSONALITY**\n" +
      "👤 introvert\n" +
      "🫂 extrovert\n\n" +

      "**NOTIFICATIONS**\n" +
      "📣 announcements\n" +
      "🎫 events\n" +
      "🫡 giveaways\n" +
      "🐻‍❄️ polls\n\n" +

      "Tap a button below to add or remove a role."
  },

  chat: {
    title: "💬 CHAT",
    description:
      "The main community chat.\n\n" +
      "Talk about your day, meet people, joke around, and have normal conversations."
  },

  "make-friends": {
    title: "🫂 MAKE FRIENDS",
    description:
      "Looking for new people to talk to?\n\n" +
      "Tell everyone what you're into and find people with similar interests."
  },

  media: {
    title: "🖼️ MEDIA",
    description:
      "Share pictures, artwork, edits, screenshots, clips, and other appropriate media."
  },

  memes: {
    title: "😂 MEMES",
    description:
      "Post your funniest memes here.\n\n" +
      "Keep everything within the server rules."
  },

  levels: {
    title: "⭐ LEVELS",
    description:
      "Chat in the community to earn XP and level up!\n\n" +

      "**Commands**\n" +
      "⭐ `/rank` — view your level\n" +
      "🏆 `/leaderboard` — view the XP leaderboard\n\n" +

      "**LEVEL REWARDS**\n" +
      "⭐ Level 5\n" +
      "🌟 Level 10\n" +
      "💫 Level 20\n" +
      "🔥 Level 30\n" +
      "👑 Level 50\n\n" +

      "Keep participating to unlock more rewards."
  },

  starboard: {
    title: "⭐ STARBOARD",
    description:
      "Messages that receive enough community reactions can be featured here.\n\n" +
      "This channel is kept clean for featured messages."
  },

  confessions: {
    title: "🤫 ANONYMOUS CONFESSIONS",
    description:
      "Want to say something without putting your Discord name on the post?\n\n" +

      "Use **/confess** to open the anonymous confession form.\n\n" +

      "Your public confession does not display your Discord username or user ID.\n\n" +

      "⚠️ Anonymous does not mean exempt from server rules. Do not submit threats, harassment, private information, or illegal content."
  },

  support: {
    title: "🆘 SUPPORT",
    description:
      "Need help with the server?\n\n" +
      "Explain the issue here and staff can help.\n\n" +
      "For private matters, contact staff instead of posting personal information."
  }
};

// ============================================================
// ROLE CREATION
// ============================================================

async function getOrCreateRole(guild, name, options = {}) {
  let role = guild.roles.cache.find(
    r => r.name === name
  );

  if (!role) {
    role = await guild.roles.create({
      name,
      ...options,
      reason: "Make Friends automatic setup"
    });
  }

  return role;
}

async function ensureRoles(guild) {
  const roles = {};

  roles.owner = await getOrCreateRole(
    guild,
    ROLE_NAMES.owner,
    {
      color: 0xF1C40F,
      hoist: true
    }
  );

  roles.coowner = await getOrCreateRole(
    guild,
    ROLE_NAMES.coowner,
    {
      color: 0xE67E22,
      hoist: true
    }
  );

  roles.admin = await getOrCreateRole(
    guild,
    ROLE_NAMES.admin,
    {
      color: 0xE74C3C,
      hoist: true
    }
  );

  roles.moderator = await getOrCreateRole(
    guild,
    ROLE_NAMES.moderator,
    {
      color: 0x3498DB,
      hoist: true
    }
  );

  roles.staff = await getOrCreateRole(
    guild,
    ROLE_NAMES.staff,
    {
      color: 0x9B59B6,
      hoist: true
    }
  );

  roles.support = await getOrCreateRole(
    guild,
    ROLE_NAMES.support,
    {
      color: 0x2ECC71,
      hoist: true
    }
  );

  roles.member = await getOrCreateRole(
    guild,
    ROLE_NAMES.member,
    {
      color: 0x95A5A6
    }
  );

  roles.bots = await getOrCreateRole(
    guild,
    ROLE_NAMES.bots,
    {
      color: 0x7289DA
    }
  );

  const selfRoles = [
    ["sheher", 0xFF69B4],
    ["hehim", 0x3498DB],
    ["theythem", 0x2ECC71],
    ["any", 0x57F287],

    ["adult", 0x95A5A6],
    ["minor", 0xE74C3C],

    ["artist", 0x9B59B6],
    ["music", 0x1ABC9C],
    ["anime", 0xE91E63],

    ["introvert", 0x7289DA],
    ["extrovert", 0xF1C40F],

    ["announcements", 0xFEE75C],
    ["events", 0xEB459E],
    ["giveaways", 0x57F287],
    ["polls", 0x5865F2]
  ];

  for (const [key, color] of selfRoles) {
    roles[key] = await getOrCreateRole(
      guild,
      ROLE_NAMES[key],
      { color }
    );
  }

  return roles;
}

// ============================================================
// CATEGORY / CHANNEL CREATION
// ============================================================

async function getOrCreateCategory(guild, name) {
  let category = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildCategory &&
      c.name === name
  );

  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      reason: "Make Friends automatic setup"
    });
  }

  return category;
}

async function getOrCreateChannel(
  guild,
  name,
  type,
  parent,
  permissionOverwrites = []
) {
  const discordType =
    type === "voice"
      ? ChannelType.GuildVoice
      : ChannelType.GuildText;

  let channel = guild.channels.cache.find(
    c =>
      c.name === name &&
      c.type === discordType &&
      c.parentId === parent.id
  );

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: discordType,
      parent: parent.id,
      permissionOverwrites,
      reason: "Make Friends automatic setup"
    });
  }

  return channel;
}

// ============================================================
// CHANNEL PERMISSIONS
// ============================================================

function textPermissions(guild, roles, locked) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory
      ],

      deny: locked
        ? [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.CreatePrivateThreads
          ]
        : []
    }
  ];

  const managementRoles = [
    roles.owner,
    roles.coowner,
    roles.admin,
    roles.moderator,
    roles.staff
  ];

  for (const role of managementRoles) {
    overwrites.push({
      id: role.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles
      ]
    });
  }

  overwrites.push({
    id: roles.support.id,

    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks
    ]
  });

  if (client.user) {
    overwrites.push({
      id: client.user.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles
      ]
    });
  }

  return overwrites;
}

function staffVoicePermissions(guild, roles) {
  return [
    {
      id: guild.roles.everyone.id,

      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect
      ]
    },

    {
      id: roles.owner.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    },

    {
      id: roles.coowner.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    },

    {
      id: roles.admin.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    },

    {
      id: roles.moderator.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    },

    {
      id: roles.staff.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    }
  ];
}

// ============================================================
// SELF ROLE BUTTONS
// ============================================================

function selfRoleButtons(roles) {
  const rows = [
    [
      ["sheher", "❤️ she/her"],
      ["hehim", "💙 he/him"],
      ["theythem", "🖤 they/them"],
      ["any", "💚 any pronouns"],
      ["adult", "🧑 adult"]
    ],

    [
      ["minor", "🔞 minor"],
      ["artist", "🎨 artist"],
      ["music", "🎹 music"],
      ["anime", "🌝 anime"],
      ["introvert", "👤 introvert"]
    ],

    [
      ["extrovert", "🫂 extrovert"],
      ["announcements", "📣 announcements"],
      ["events", "🎫 events"],
      ["giveaways", "🫡 giveaways"],
      ["polls", "🐻‍❄️ polls"]
    ]
  ];

  return rows.map(row =>
    new ActionRowBuilder().addComponents(
      row.map(([key, label]) =>
        new ButtonBuilder()
          .setCustomId(
            `selfrole:${roles[key].id}`
          )
          .setLabel(label)
          .setStyle(ButtonStyle.Secondary)
      )
    )
  );
}

// ============================================================
// EMBEDS
// ============================================================

function makeEmbed(channelName) {
  const data = TEXT_CONTENT[channelName];

  if (!data) {
    return null;
  }

  return new EmbedBuilder()
    .setTitle(data.title)
    .setDescription(data.description)
    .setFooter({
      text: "Make Friends | Community"
    })
    .setTimestamp();
}

async function seedChannel(
  channel,
  channelName,
  roles
) {
  if (!TEXT_CONTENT[channelName]) {
    return;
  }

  const recent =
    await channel.messages.fetch({
      limit: 30
    }).catch(() => null);

  if (!recent) {
    return;
  }

  // Prevent duplicate panels.
  if (
    recent.some(
      message =>
        message.author.id === client.user.id &&
        message.embeds.length
    )
  ) {
    return;
  }

  const embed = makeEmbed(channelName);

  if (!embed) {
    return;
  }

  if (channelName === "self-roles") {
    await channel.send({
      embeds: [embed],
      components: selfRoleButtons(roles)
    });

    return;
  }

  await channel.send({
    embeds: [embed]
  });
}

// ============================================================
// SERVER SETUP
// ============================================================

async function setupGuild(guild) {
  console.log(
    `⚙️ Setting up ${guild.name}`
  );

  const roles =
    await ensureRoles(guild);

  // Give owner owner role.
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
    let categoryIndex = 0;
    categoryIndex < STRUCTURE.length;
    categoryIndex++
  ) {
    const section =
      STRUCTURE[categoryIndex];

    const category =
      await getOrCreateCategory(
        guild,
        section.name
      );

    await category
      .setPosition(categoryIndex)
      .catch(() => {});

    for (
      const rawChannel of section.channels
    ) {
      const definition =
        typeof rawChannel === "string"
          ? {
              name: rawChannel,
              type: "text"
            }
          : rawChannel;

      const fullName =
        `${PREFIX} ${definition.name}`;

      let overwrites = [];

      if (section.staffOnly) {
        overwrites =
          staffVoicePermissions(
            guild,
            roles
          );
      } else if (
        definition.type === "text"
      ) {
        overwrites =
          textPermissions(
            guild,
            roles,
            LOCKED_CHANNELS.has(
              definition.name
            )
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

      // Re-apply permissions.
      if (overwrites.length) {
        for (
          const overwrite of overwrites
        ) {
          await channel.permissionOverwrites
            .edit(
              overwrite.id,
              {
                allow:
                  overwrite.allow || [],
                deny:
                  overwrite.deny || []
              }
            )
            .catch(() => {});
        }
      }

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
      c =>
        c.type ===
          ChannelType.GuildText &&
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
// COMMAND REGISTRATION
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
      .addUserOption(option =>
        option
          .setName("user")
          .setDescription(
            "View another member's rank."
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
        "Create or repair the complete server."
      )
      .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageGuild.toString()
      ),

    new SlashCommandBuilder()
      .setName("help")
      .setDescription(
        "Show Make Friends bot commands."
      )
  ].map(command =>
    command.toJSON()
  );

  const rest =
    new REST({
      version: "10"
    }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(
      client.user.id
    ),
    {
      body: commands
    }
  );

  console.log(
    "✅ Slash commands registered."
  );
}

// ============================================================
// CONFESSIONS
// ============================================================

async function getConfessionChannel(guild) {
  return guild.channels.cache.find(
    c =>
      c.type ===
        ChannelType.GuildText &&
      c.name ===
        `${PREFIX} confessions`
  );
}

function confessionModal() {
  const modal =
    new ModalBuilder()
      .setCustomId(
        "makefriends_confession"
      )
      .setTitle(
        "🤫 Anonymous Confession"
      );

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

  modal.addComponents(
    new ActionRowBuilder()
      .addComponents(input)
  );

  return modal;
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {
  console.log(
    `✅ Logged in as ${client.user.tag}`
  );

  client.user.setPresence({
    activities: [
      {
        name:
          "Make Friends | Community",
        type:
          ActivityType.Watching
      }
    ],
    status: "online"
  });

  await registerCommands();

  for (
    const guild of
    client.guilds.cache.values()
  ) {
    await setupGuild(guild)
      .catch(error => {
        console.error(
          `❌ Setup failed in ${guild.name}:`,
          error
        );
      });
  }
});

// ============================================================
// NEW SERVER
// ============================================================

client.on(
  "guildCreate",
  async guild => {
    console.log(
      `➕ Bot added to ${guild.name}`
    );

    await setupGuild(guild)
      .catch(error => {
        console.error(
          "❌ New server setup failed:",
          error
        );
      });
  }
);

// ============================================================
// NEW MEMBER
// ============================================================

client.on(
  "guildMemberAdd",
  async member => {
    const roleName =
      member.user.bot
        ? ROLE_NAMES.bots
        : ROLE_NAMES.member;

    const role =
      member.guild.roles.cache.find(
        r => r.name === roleName
      );

    if (role) {
      await member.roles
        .add(role)
        .catch(() => {});
    }

    if (!member.user.bot) {
      const welcome =
        member.guild.channels.cache.find(
          c =>
            c.type ===
              ChannelType.GuildText &&
            c.name ===
              `${PREFIX} welcome`
        );

      if (welcome) {
        await welcome.send(
          `👋 Welcome <@${member.id}> to **${member.guild.name}**!`
        ).catch(() => {});
      }
    }
  }
);

// ============================================================
// LEVELING SYSTEM
// ============================================================

client.on(
  "messageCreate",
  async message => {
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

    // One XP award every 60 seconds.
    if (
      now - last < 60_000
    ) {
      return;
    }

    XP_COOLDOWN.set(
      key,
      now
    );

    const data =
      getUserLevelData(
        message.guild.id,
        message.author.id
      );

    const before =
      levelFromTotalXP(
        data.xp
      ).level;

    // Random 15–25 XP.
    const gained =
      Math.floor(
        Math.random() * 11
      ) + 15;

    data.xp += gained;

    const after =
      levelFromTotalXP(
        data.xp
      ).level;

    data.level = after;

    saveLevels();

    if (after > before) {
      const rewardRole =
        await giveLevelRewards(
          message.member,
          after
        );

      const levelsChannel =
        message.guild.channels.cache.find(
          c =>
            c.type ===
              ChannelType.GuildText &&
            c.name ===
              `${PREFIX} levels`
        );

      if (levelsChannel) {
        const rewardText =
          rewardRole
            ? `\n🎁 You unlocked **${rewardRole.name}**!`
            : "";

        await levelsChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "🎉 LEVEL UP!"
              )
              .setDescription(
                `${message.author} reached **Level ${after}**!${rewardText}`
              )
              .setThumbnail(
                message.author
                  .displayAvatarURL()
              )
              .setFooter({
                text:
                  "Keep chatting to level up!"
              })
              .setTimestamp()
          ]
        }).catch(() => {});
      }
    }
  }
);

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
  "interactionCreate",
  async interaction => {

    // ========================================================
    // SLASH COMMANDS
    // ========================================================

    if (
      interaction.isChatInputCommand()
    ) {

      // ---------------- HELP ----------------

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
                "**Commands**\n\n" +

                "🤫 `/confess` — anonymous confession\n" +

                "⭐ `/rank` — view your level and XP\n" +

                "🏆 `/leaderboard` — XP leaderboard\n" +

                "ℹ️ `/serverinfo` — server information\n" +

                "⚙️ `/setup` — repair/create server\n\n" +

                "Make Friends | Community"
              )
              .setFooter({
                text:
                  "Make Friends | Community"
              })
          ]
        });
      }

      // ---------------- RANK ----------------

      if (
        interaction.commandName ===
        "rank"
      ) {
        const target =
          interaction.options.getUser(
            "user"
          ) ||
          interaction.user;

        const member =
          await interaction.guild
            .members
            .fetch(target.id)
            .catch(() => null);

        if (!member) {
          return interaction.reply({
            content:
              "❌ I couldn't find that member.",
            ephemeral: true
          });
        }

        const data =
          getUserLevelData(
            interaction.guild.id,
            target.id
          );

        const calculated =
          levelFromTotalXP(
            data.xp
          );

        const progress =
          Math.floor(
            (
              calculated.xp /
              calculated.needed
            ) * 100
          );

        const barLength = 12;

        const filled =
          Math.round(
            (progress / 100) *
              barLength
          );

        const bar =
          "▰".repeat(filled) +
          "▱".repeat(
            barLength - filled
          );

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name:
                  `${target.username}'s Level`,
                iconURL:
                  target.displayAvatarURL()
              })

              .setDescription(
                `⭐ **Level:** ${calculated.level}\n` +
                `✨ **XP:** ${calculated.xp} / ${calculated.needed}\n\n` +
                `${bar} **${progress}%**`
              )

              .setFooter({
                text:
                  "Chat to earn XP • Make Friends | Community"
              })
          ]
        });
      }

      // ---------------- LEADERBOARD ----------------

      if (
        interaction.commandName ===
        "leaderboard"
      ) {
        const guildData =
          levelData[
            interaction.guild.id
          ] || {};

        const entries =
          Object.entries(
            guildData
          )
            .map(
              ([userId, data]) => ({
                userId,

                xp:
                  Number(data.xp) || 0,

                level:
                  levelFromTotalXP(
                    Number(data.xp) || 0
                  ).level
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
              "⭐ Nobody has earned XP yet. Start chatting!",
            ephemeral: true
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

          if (!user) {
            continue;
          }

          lines.push(
            `**${i + 1}.** ${user} — **Level ${entry.level}** • ${entry.xp.toLocaleString()} XP`
          );
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
              )
              .setFooter({
                text:
                  "Make Friends | Community"
              })
          ]
        });
      }

      // ---------------- SERVER INFO ----------------

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
                  name: "👥 Members",
                  value:
                    `${guild.memberCount}`,
                  inline: true
                },

                {
                  name: "💬 Channels",
                  value:
                    `${guild.channels.cache.size}`,
                  inline: true
                },

                {
                  name: "🎭 Roles",
                  value:
                    `${guild.roles.cache.size}`,
                  inline: true
                }
              )

              .setFooter({
                text:
                  "Make Friends | Community"
              })
          ]
        });
      }

      // ---------------- SETUP ----------------

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
              "❌ You need **Manage Server** to use `/setup`.",
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        await setupGuild(
          interaction.guild
        );

        return interaction.editReply(
          "✅ Server setup repaired successfully."
        );
      }

      // ---------------- CONFESS ----------------

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
              "❌ `9Є • confessions` doesn't exist. Ask an admin to use `/setup`.",
            ephemeral: true
          });
        }

        return interaction.showModal(
          confessionModal()
        );
      }
    }

    // ========================================================
    // SELF ROLE BUTTONS
    // ========================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "selfrole:"
      )
    ) {
      const roleId =
        interaction.customId
          .split(":")[1];

      const role =
        interaction.guild.roles.cache.get(
          roleId
        );

      if (!role) {
        return interaction.reply({
          content:
            "❌ That role no longer exists.",
          ephemeral: true
        });
      }

      // Age roles are mutually exclusive.
      const adult =
        interaction.guild.roles.cache.find(
          r =>
            r.name ===
            ROLE_NAMES.adult
        );

      const minor =
        interaction.guild.roles.cache.find(
          r =>
            r.name ===
            ROLE_NAMES.minor
        );

      if (
        adult &&
        minor &&
        [adult.id, minor.id]
          .includes(role.id)
      ) {
        const other =
          role.id === adult.id
            ? minor
            : adult;

        if (
          interaction.member.roles.cache.has(
            other.id
          )
        ) {
          await interaction.member.roles
            .remove(other)
            .catch(() => {});
        }
      }

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
          ephemeral: true
        });
      }

      await interaction.member.roles
        .add(role)
        .catch(() => {});

      return interaction.reply({
        content:
          `➕ Added ${role}.`,
        ephemeral: true
      });
    }

    // ========================================================
    // CONFESSION MODAL
    // ========================================================

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
            "❌ The confession channel no longer exists.",
          ephemeral: true
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
          ephemeral: true
        });
      }

      const embed =
        new EmbedBuilder()
          .setAuthor({
            name:
              "🤫 Anonymous Confession"
          })

          .setDescription(
            confession
          )

          .setFooter({
            text:
              "Anonymous • Make Friends | Community"
          })

          .setTimestamp();

      // No username, tag, avatar, or user ID
      // is placed into the public message.
      await channel.send({
        embeds: [embed],

        allowedMentions: {
          parse: []
        }
      });

      return interaction.reply({
        content:
          "✅ Your confession was posted anonymously in `9Є • confessions`.",
        ephemeral: true
      });
    }
  }
});

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);