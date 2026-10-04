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
    tribe: text('tribe', { enum: ['legion', 'clans', 'horde'] }).notNull(),
    role: text('role', { enum: ['player', 'admin'] }).notNull().default('player'),
    banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    protectedUntil: integer('protected_until').notNull(),
    offPoints: integer('off_points').notNull().default(0),
    defPoints: integer('def_points').notNull().default(0),
    lootTotal: integer('loot_total').notNull().default(0),
    culturePoints: real('culture_points').notNull().default(0),
    cultureAt: integer('culture_at').notNull().default(0),
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
    kind: text('kind', { enum: ['attack', 'raid', 'reinforce', 'scout', 'return'] }).notNull(),
    fromVillageId: integer('from_village_id').notNull().references(() => villages.id, { onDelete: 'cascade' }),
    toVillageId: integer('to_village_id').references(() => villages.id, { onDelete: 'set null' }),
    /** Where the troops set out from (for returns: the village they are coming back from). */
    originX: integer('origin_x').notNull(),
    originY: integer('origin_y').notNull(),
    toX: integer('to_x').notNull(),
    toY: integer('to_y').notNull(),
    units: text('units').notNull(),
    loot: text('loot'),
    catapultTarget: text('catapult_target'),
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
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('reports_user_idx').on(t.userId, t.createdAt)],
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
