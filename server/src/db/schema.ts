import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

// ---------- Enums ----------

export const agentStatusEnum = pgEnum('agent_status', [
  'created',
  'starting',
  'running',
  'stopped',
  'error',
  'deleted',
]);

// ---------- Tables ----------

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => accounts.id),
  name: text('name').notNull(),
  description: text('description').default(''),
  avatar: text('avatar'),
  category: text('category'),
  status: agentStatusEnum('status').notNull().default('created'),
  channelUrl: text('channel_url'),
  containerName: text('container_name'),
  currentSessionId: integer('current_session_id').notNull().default(1),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
