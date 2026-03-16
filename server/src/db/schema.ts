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

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  name: text('name').notNull(),
  description: text('description').default(''),
  imageTag: text('image_tag'),
  status: agentStatusEnum('status').notNull().default('created'),
  channelUrl: text('channel_url'),
  containerName: text('container_name'),
  config: jsonb('config').default({}),
  currentSessionId: integer('current_session_id').notNull().default(1),
  resourceProfile: text('resource_profile').notNull().default('default'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const skillInstallations = pgTable('skill_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id),
  skillName: text('skill_name').notNull(),
  version: text('version').notNull().default('latest'),
  installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
});

