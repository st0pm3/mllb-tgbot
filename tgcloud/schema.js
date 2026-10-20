import {table, text, integer} from 'sdk/db';

// Compact immutable snapshots keep publication atomic and avoid foreign-key assumptions.
// Split payloads into indexed tables only after measuring the confirmed platform budget.
export const contentRevisions = table('content_revisions', {
  id: text('id').primaryKey(), payload:text('payload').notNull(),
  createdBy:integer('created_by').notNull(), createdAt:integer('created_at').notNull(),
});
export const appState = table('app_state', {key:text('key').primaryKey(),value:text('value').notNull()});
export const preferences = table('preferences', {
  userId:integer('user_id').primaryKey(), payload:text('payload').notNull(),
  version:integer('version').notNull().default(0), updatedAt:integer('updated_at').notNull(),
});
