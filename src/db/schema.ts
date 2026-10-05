import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull(),
    usernameLower: text('username_lower').notNull(),
    passwordHash: text('password_hash').notNull(),
    tribe: text('tribe', { enum: ['romans', 'teutons', 'gauls', 'natars'] }).notNull(),
    role: text('role', { enum: ['player', 'admin'] }).notNull().default('player'),
    banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    protectedUntil: integer('protected_until').notNull(),
    /** The player hid the beginner tasks panel. */
    tasksHidden: integer('tasks_hidden', { mode: 'boolean' }).notNull().default(false),
    /** Last time the Natars attacked this player (at most one a day, from 300 population). */
    natarAttackAt: integer('natar_attack_at').notNull().default(0),
    /** Gold Club member (bought once per world): farm lists, evasion, trade routes, cropper finder. */
    goldClub: integer('gold_club', { mode: 'boolean' }).notNull().default(false),
    /** End of the last protection bought with Gold (another can be bought 8 h after it ends). */
    boughtProtectionEnd: integer('bought_protection_end').notNull().default(0),
    offPoints: integer('off_points').notNull().default(0),
    defPoints: integer('def_points').notNull().default(0),
    lootTotal: integer('loot_total').notNull().default(0),
    culturePoints: real('culture_points').notNull().default(0),
    cultureAt: integer('culture_at').notNull().default(0),
    mutedUntil: integer('muted_until').notNull().default(0),
    /** When the uploaded profile picture last changed (0 = use the tribe default). */
    avatarAt: integer('avatar_at').notNull().default(0),
    /** Free "About me" text on the public profile. */
    bio: text('bio').notNull().default(''),
  },
  (t) => [uniqueIndex('users_username_lower_idx').on(t.usernameLower)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(), // sha256 of the cookie token
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    csrf: text('csrf').notNull(),
    villageId: integer('village_id'),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const tiles = sqliteTable(
  'tiles',
  {
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    kind: text('kind', { enum: ['field', 'oasis'] }).notNull(),
    layout: text('layout'),
    oasis: text('oasis'),
    villageId: integer('village_id'),
    /** Oases: JSON number[10] of wild animals and when they last regrew. */
    animals: text('animals'),
    animalsAt: integer('animals_at'),
    /** Unoccupied oases: JSON resources stored there (lootable) and when they were last updated. */
    /** Owned oases: loyalty (100 = firmly held) and when it was last updated. */
    oasisLoyalty: real('oasis_loyalty').notNull().default(100),
    oasisLoyaltyAt: integer('oasis_loyalty_at'),
    oasisRes: text('oasis_res'),
    oasisResAt: integer('oasis_res_at'),
  },
  (t) => [primaryKey({ columns: [t.x, t.y] }), index('tiles_village_idx').on(t.villageId)],
);

export const villages = sqliteTable(
  'villages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    isCapital: integer('is_capital', { mode: 'boolean' }).notNull().default(false),
    wood: real('wood').notNull(),
    clay: real('clay').notNull(),
    iron: real('iron').notNull(),
    crop: real('crop').notNull(),
    resAt: integer('res_at').notNull(),
    pop: integer('pop').notNull().default(0),
    loyalty: real('loyalty').notNull().default(100),
    /** JSON number[10]: 1 = unit researched in the Academy. */
    research: text('research').notNull().default('[1,0,0,0,0,0,0,0,0,0]'),
    /** JSON number[10]: Blacksmith (attack) upgrade level per unit. */
    blacksmith: text('blacksmith').notNull().default('[0,0,0,0,0,0,0,0,0,0]'),
    /** JSON number[10]: Armoury (defence) upgrade level per unit. */
    armoury: text('armoury').notNull().default('[0,0,0,0,0,0,0,0,0,0]'),
    /** Gaul trapper: units of other villages held prisoner here (JSON {ownerVillageId: number[10]}). */
    prisoners: text('prisoners').notNull().default('{}'),
    /** Gaul traps built in this village (each holds one prisoner). */
    traps: integer('traps').notNull().default(0),
    /** Gold "Storage expansion": warehouse and granary hold 50% more, permanently. */
    storageBoost: integer('storage_boost', { mode: 'boolean' }).notNull().default(false),
    /** Gold Club evasion: the village's own troops leave when an attack arrives (capital only). */
    evade: integer('evade', { mode: 'boolean' }).notNull().default(false),
    /** A World Wonder village (Natar-founded; the Wonder stands on plot 25). */
    wonder: integer('wonder', { mode: 'boolean' }).notNull().default(false),
    /** Villages founded or conquered from here (uses expansion slots). */
    expansions: integer('expansions').notNull().default(0),
    /** Village this one was founded from (null for starting villages). */
    parentId: integer('parent_id'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('villages_xy_idx').on(t.x, t.y), index('villages_user_idx').on(t.userId)],
);

export const slots = sqliteTable(
  'slots',
  {
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    slot: integer('slot').notNull(),
    building: text('building'),
    level: integer('level').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.villageId, t.slot] })],
);

/** Troops stationed in `villageId`, owned by `ownerVillageId` (equal for troops at home). */
export const troops = sqliteTable(
  'troops',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    ownerVillageId: integer('owner_village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    units: text('units').notNull(), // JSON number[10]
  },
  (t) => [uniqueIndex('troops_loc_owner_idx').on(t.villageId, t.ownerVillageId), index('troops_owner_idx').on(t.ownerVillageId)],
);

/** Troops stationed in an oasis (reinforcements sent to an oasis you or an ally hold). */
export const oasisTroops = sqliteTable(
  'oasis_troops',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    ownerVillageId: integer('owner_village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    units: text('units').notNull(), // JSON number[10]
  },
  (t) => [uniqueIndex('oasis_troops_loc_owner_idx').on(t.x, t.y, t.ownerVillageId), index('oasis_troops_owner_idx').on(t.ownerVillageId)],
);

export const buildOrders = sqliteTable(
  'build_orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    slot: integer('slot').notNull(),
    building: text('building').notNull(),
    toLevel: integer('to_level').notNull(),
    startAt: integer('start_at').notNull(),
    finishAt: integer('finish_at').notNull(),
    /** Demolition (Main Building 10+): takes the building down one level; doesn't use a builder. */
    demolish: integer('demolish', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('build_orders_finish_idx').on(t.finishAt), index('build_orders_village_idx').on(t.villageId)],
);

export const trainOrders = sqliteTable(
  'train_orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    building: text('building').notNull(),
    unitSlot: integer('unit_slot').notNull(),
    total: integer('total').notNull(),
    done: integer('done').notNull().default(0),
    perUnitMs: integer('per_unit_ms').notNull(),
    startAt: integer('start_at').notNull(),
  },
  (t) => [index('train_orders_village_idx').on(t.villageId)],
);

export const movements = sqliteTable(
  'movements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kind: text('kind', { enum: ['attack', 'raid', 'reinforce', 'scout', 'return', 'settle', 'trade', 'merchant_return', 'delivery'] }).notNull(),
    fromVillageId: integer('from_village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    toVillageId: integer('to_village_id').references(() => villages.id, { onDelete: 'set null' }),
    /** Where the troops set out from (for returns: the village they are coming back from). */
    originX: integer('origin_x').notNull(),
    originY: integer('origin_y').notNull(),
    toX: integer('to_x').notNull(),
    toY: integer('to_y').notNull(),
    units: text('units').notNull(),
    /** Loot carried home, or goods carried by merchants. */
    loot: text('loot'),
    catapultTarget: text('catapult_target'),
    hero: integer('hero', { mode: 'boolean' }).notNull().default(false),
    merchants: integer('merchants').notNull().default(0),
    departAt: integer('depart_at').notNull(),
    arriveAt: integer('arrive_at').notNull(),
  },
  (t) => [
    index('movements_arrive_idx').on(t.arriveAt),
    index('movements_from_idx').on(t.fromVillageId),
    index('movements_to_idx').on(t.toVillageId),
  ],
);

export const reports = sqliteTable(
  'reports',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    data: text('data').notNull(),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    /** For battles: how the recipient's own troops fared — 'none' | 'some' | 'all' lost; '-' otherwise. */
    outcome: text('outcome'),
    /** Where it happened, for "your reports on this tile": the sending village and the target tile. */
    fromX: integer('from_x'),
    fromY: integer('from_y'),
    toX: integer('to_x'),
    toY: integer('to_y'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('reports_user_idx').on(t.userId, t.createdAt),
    index('reports_user_to_idx').on(t.userId, t.toX, t.toY),
    index('reports_user_from_idx').on(t.userId, t.fromX, t.fromY),
  ],
);

export const messages = sqliteTable(
  'messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fromUserId: integer('from_user_id').references(() => users.id, { onDelete: 'set null' }),
    toUserId: integer('to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    deletedBySender: integer('deleted_by_sender', { mode: 'boolean' }).notNull().default(false),
    deletedByRecipient: integer('deleted_by_recipient', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('messages_to_idx').on(t.toUserId, t.createdAt), index('messages_from_idx').on(t.fromUserId, t.createdAt)],
);

/**
 * Time-limited or permanent bonuses for a player. Premium purchases (credits) and
 * token-holder tiers write rows here; the game reads them through the modifier system.
 */
export const perks = sqliteTable(
  'perks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    value: real('value').notNull(),
    source: text('source').notNull(),
    expiresAt: integer('expires_at'),
    createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index('perks_user_idx').on(t.userId)],
);

export const researchOrders = sqliteTable(
  'research_orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['academy', 'blacksmith', 'armoury'] }).notNull(),
    unitSlot: integer('unit_slot').notNull(),
    toLevel: integer('to_level').notNull(),
    startAt: integer('start_at').notNull(),
    finishAt: integer('finish_at').notNull(),
  },
  (t) => [index('research_orders_finish_idx').on(t.finishAt), index('research_orders_village_idx').on(t.villageId)],
);

export const heroes = sqliteTable(
  'heroes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    homeVillageId: integer('home_village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    /** Where the hero is now; null while travelling or dead. */
    locationId: integer('location_id'),
    status: text('status', { enum: ['home', 'away', 'moving', 'dead', 'reviving'] }).notNull().default('home'),
    level: integer('level').notNull().default(0),
    xp: integer('xp').notNull().default(0),
    health: real('health').notNull().default(100),
    healthAt: integer('health_at').notNull(),
    /** T3 hero: the unit it was trained from (slot of the owner's tribe) sets its base stats and speed. */
    unitSlot: integer('unit_slot').notNull().default(0),
    /** Skill points: attack (`strength`), defence, attack bonus, defence bonus, regeneration. */
    strength: integer('strength').notNull().default(0),
    defPoints: integer('def_points').notNull().default(0),
    offBonus: integer('off_bonus').notNull().default(0),
    defBonus: integer('def_bonus').notNull().default(0),
    regen: integer('regen').notNull().default(0),
    /** Unused since the classic hero (T4 production skill); kept for old rows. */
    production: integer('production').notNull().default(0),
    reviveAt: integer('revive_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('heroes_user_idx').on(t.userId)],
);

export const marketOffers = sqliteTable(
  'market_offers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    offerRes: text('offer_res').notNull(),
    offerAmount: integer('offer_amount').notNull(),
    wantRes: text('want_res').notNull(),
    wantAmount: integer('want_amount').notNull(),
    merchants: integer('merchants').notNull(),
    maxHours: integer('max_hours'),
    /** Only members of the seller's alliance may accept. */
    allianceOnly: integer('alliance_only', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('market_offers_village_idx').on(t.villageId)],
);

export const alliances = sqliteTable(
  'alliances',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    tag: text('tag').notNull(),
    tagLower: text('tag_lower').notNull(),
    description: text('description').notNull().default(''),
    founderId: integer('founder_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('alliances_tag_idx').on(t.tagLower)],
);

export const allianceMembers = sqliteTable(
  'alliance_members',
  {
    userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    allianceId: integer('alliance_id').notNull().references(() => alliances.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['leader', 'officer', 'member'] }).notNull().default('member'),
    joinedAt: integer('joined_at').notNull(),
  },
  (t) => [index('alliance_members_alliance_idx').on(t.allianceId)],
);

export const allianceInvites = sqliteTable(
  'alliance_invites',
  {
    allianceId: integer('alliance_id').notNull().references(() => alliances.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    invitedBy: integer('invited_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.allianceId, t.userId] })],
);

export const allianceDiplomacy = sqliteTable(
  'alliance_diplomacy',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fromId: integer('from_id').notNull().references(() => alliances.id, { onDelete: 'cascade' }),
    toId: integer('to_id').notNull().references(() => alliances.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['confed', 'nap', 'war'] }).notNull(),
    status: text('status', { enum: ['proposed', 'active'] }).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('alliance_diplomacy_from_idx').on(t.fromId), index('alliance_diplomacy_to_idx').on(t.toId)],
);

/** Chat: allianceId null = global chat. */
export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    allianceId: integer('alliance_id').references(() => alliances.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('chat_channel_idx').on(t.allianceId, t.id)],
);

/** Append-only credits ledger; a player's balance is the sum of their rows. */
export const creditsLedger = sqliteTable(
  'credits_ledger',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    /** Unique key that makes every credit/debit idempotent (e.g. "deposit:0xtx:3"). */
    idemKey: text('idem_key').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('credits_idem_idx').on(t.idemKey), index('credits_user_idx').on(t.userId)],
);

/** All-time totals of each player at the start of a week; weekly stats are "now minus this". */
export const weekSnapshots = sqliteTable(
  'week_snapshots',
  {
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    weekStart: integer('week_start').notNull(),
    off: integer('off').notNull(),
    def: integer('def').notNull(),
    loot: integer('loot').notNull(),
    pop: integer('pop').notNull(),
    villages: integer('villages').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekStart] })],
);

/** Weeks whose snapshot was taken (and, for finished weeks, whose medals were awarded). */
export const weeks = sqliteTable('weeks', {
  weekStart: integer('week_start').primaryKey(),
  startedAt: integer('started_at').notNull(),
  finalizedAt: integer('finalized_at'),
});

/** Weekly top-3 medals. */
export const medals = sqliteTable(
  'medals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    weekStart: integer('week_start').notNull(),
    category: text('category', { enum: ['attack', 'defense', 'population', 'expansion', 'raid'] }).notNull(),
    rank: integer('rank').notNull(),
    value: integer('value').notNull(),
    prize: integer('prize').notNull(),
  },
  (t) => [uniqueIndex('medals_week_cat_rank').on(t.weekStart, t.category, t.rank), index('medals_user_idx').on(t.userId)],
);

/** Artifacts (T3.6 endgame): held in a village's Treasury; small ones work for that village, large/unique for the whole account. */
export const artifacts = sqliteTable(
  'artifacts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kind: text('kind', { enum: ['architect', 'boots', 'eyes', 'diet', 'trainer', 'storage', 'confusion', 'fool', 'plan'] }).notNull(),
    size: text('size', { enum: ['small', 'large', 'unique'] }).notNull(),
    villageId: integer('village_id').references(() => villages.id, { onDelete: 'set null' }),
    /** Effects start this long after a capture (24 h / world speed). */
    activeAt: integer('active_at').notNull(),
    capturedAt: integer('captured_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('artifacts_village_idx').on(t.villageId)],
);

/** Destinations a player saved for sending merchants (and troops) again later. */
export const savedPlaces = sqliteTable(
  'saved_places',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    label: text('label').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('saved_places_user_xy').on(t.userId, t.x, t.y)],
);

/** Beginner task rewards a player has collected. */
export const taskClaims = sqliteTable(
  'task_claims',
  {
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    taskId: text('task_id').notNull(),
    claimedAt: integer('claimed_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.taskId] })],
);

/** Gold Club farm lists: saved raid targets sent from one village with one click (or automatically). */
export const farmLists = sqliteTable(
  'farm_lists',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Auto-repeat interval in real minutes (null = only when the player clicks). */
    autoMinutes: integer('auto_minutes'),
    lastRunAt: integer('last_run_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('farm_lists_user_idx').on(t.userId)],
);

export const farmEntries = sqliteTable(
  'farm_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    listId: integer('list_id').notNull().references(() => farmLists.id, { onDelete: 'cascade' }),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    units: text('units').notNull(),
    /** Last raid sent: when, and the outcome of its report (won / lost / losses). */
    lastSentAt: integer('last_sent_at'),
    lastResult: text('last_result'),
    lastLoot: integer('last_loot'),
    lastNote: text('last_note'),
  },
  (t) => [index('farm_entries_list_idx').on(t.listId)],
);

/** Gold Club Oasis Raider: one automatic oasis-raiding setup per village. */
export const oasisRaiders = sqliteTable(
  'oasis_raiders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
    radius: integer('radius').notNull().default(10),
    minRes: integer('min_res').notNull().default(1000),
    /** Most animals an oasis may have (0 = only empty oases). */
    maxAnimals: integer('max_animals').notNull().default(0),
    /** JSON boolean[10]: unit types the raider may send. */
    allowed: text('allowed').notNull(),
    /** JSON number[10]: troops always kept at home. */
    reserve: text('reserve').notNull(),
    /**
     * 'auto' = spread the free troops over many oases (each gets a fair share, never more than
     * its loot needs); 'max' = richest oasis first, as many troops as its loot needs;
     * 'fixed' = the `fixed` group every time.
     */
    sizeMode: text('size_mode', { enum: ['auto', 'max', 'fixed'] }).notNull().default('auto'),
    fixed: text('fixed').notNull(),
    maxPerRaid: integer('max_per_raid').notNull().default(0),
    intervalMin: integer('interval_min').notNull().default(10),
    maxRaids: integer('max_raids').notNull().default(20),
    lastRunAt: integer('last_run_at'),
    dayKey: integer('day_key').notNull().default(0),
    dayRaids: integer('day_raids').notNull().default(0),
    /** JSON: the last checks, newest first. */
    log: text('log').notNull().default('[]'),
  },
  (t) => [uniqueIndex('oasis_raiders_village_idx').on(t.villageId)],
);

/** Map fields a player never wants raided automatically. */
export const farmBlocks = sqliteTable(
  'farm_blocks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
  },
  (t) => [uniqueIndex('farm_blocks_idx').on(t.userId, t.x, t.y)],
);

/** Gold Club trade routes: merchants deliver resources between your villages on a daily schedule. */
export const tradeRoutes = sqliteTable(
  'trade_routes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    fromVillageId: integer('from_village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    toVillageId: integer('to_village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    goods: text('goods').notNull(),
    /** First delivery hour (UTC, 0–23) and deliveries per day (1–3, evenly spaced). */
    hour: integer('hour').notNull(),
    perDay: integer('per_day').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    lastRunAt: integer('last_run_at'),
    lastNote: text('last_note'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('trade_routes_from_idx').on(t.fromVillageId)],
);

/** Gold market: resources or troops a player sells to others for Gold. Goods are held in escrow. */
export const marketListings = sqliteTable(
  'market_listings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sellerId: integer('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    villageId: integer('village_id').references(() => villages.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['resources', 'troops'] }).notNull(),
    tribe: text('tribe').notNull(),
    goods: text('goods').notNull(),
    units: text('units').notNull(),
    price: integer('price').notNull(),
    status: text('status', { enum: ['open', 'sold', 'cancelled'] }).notNull().default('open'),
    buyerId: integer('buyer_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at').notNull(),
    closedAt: integer('closed_at'),
  },
  (t) => [index('market_open_idx').on(t.status, t.kind), index('market_seller_idx').on(t.sellerId)],
);

/** Paid news-ticker messages shown to every player during their time slot. */
export const tickerMessages = sqliteTable(
  'ticker_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    startsAt: integer('starts_at').notNull(),
    endsAt: integer('ends_at').notNull(),
    price: integer('price').notNull(),
    status: text('status', { enum: ['scheduled', 'removed'] }).notNull().default('scheduled'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('ticker_time_idx').on(t.startsAt, t.endsAt)],
);

export const wallets = sqliteTable(
  'wallets',
  {
    userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    /** Lower-case 0x address. */
    address: text('address').notNull(),
    linkedAt: integer('linked_at').notNull(),
    tier: text('tier'),
  },
  (t) => [uniqueIndex('wallets_address_idx').on(t.address)],
);

export const walletNonces = sqliteTable('wallet_nonces', {
  nonce: text('nonce').primaryKey(),
  userId: integer('user_id'),
  purpose: text('purpose', { enum: ['link', 'login'] }).notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const holderSnapshots = sqliteTable(
  'holder_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    address: text('address').notNull(),
    /** Raw token units as a decimal string (can exceed 2^53). */
    balance: text('balance').notNull(),
    totalSupply: text('total_supply').notNull(),
    takenAt: integer('taken_at').notNull(),
  },
  (t) => [index('holder_snapshots_addr_idx').on(t.address, t.takenAt)],
);

/** On-chain deposits seen by the indexer (one row per log). */
export const deposits = sqliteTable(
  'deposits',
  {
    id: text('id').primaryKey(), // txHash:logIndex
    userId: integer('user_id'),
    payer: text('payer').notNull(),
    asset: text('asset').notNull(),
    amount: text('amount').notNull(),
    credits: integer('credits').notNull(),
    blockNumber: integer('block_number').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('deposits_user_idx').on(t.userId)],
);

/** Town Hall celebrations (one at a time per village). */
export const celebrations = sqliteTable(
  'celebrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    villageId: integer('village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['small', 'great'] }).notNull(),
    culturePoints: integer('culture_points').notNull(),
    startAt: integer('start_at').notNull(),
    finishAt: integer('finish_at').notNull(),
  },
  (t) => [index('celebrations_finish_idx').on(t.finishAt), index('celebrations_village_idx').on(t.villageId)],
);
