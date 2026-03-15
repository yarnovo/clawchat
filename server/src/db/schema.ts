import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  integer,
  real,
  decimal,
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

export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'pending',
  'published',
  'rejected',
]);

export const usageTypeEnum = pgEnum('usage_type', [
  'chat',
  'token',
  'skill_install',
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const marketListings = pgTable('market_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id),
  ownerId: uuid('owner_id').notNull(),
  title: text('title').notNull(),
  description: text('description').default(''),
  category: text('category').default('general'),
  tags: text('tags').array().default([]),
  price: decimal('price', { precision: 10, scale: 2 }).default('0.00'),
  status: listingStatusEnum('status').notNull().default('draft'),
  downloads: integer('downloads').notNull().default(0),
  rating: real('rating').default(0),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usageRecords = pgTable('usage_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  agentId: uuid('agent_id').notNull(),
  type: usageTypeEnum('type').notNull(),
  amount: integer('amount').notNull().default(0),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
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

export const marketReviews = pgTable('market_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => marketListings.id),
  userId: uuid('user_id').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
