import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey(), owner: text('owner').notNull(),
  data: text('data').notNull(), revision: integer('revision').notNull().default(0),
  created: text('created').notNull(),
});
