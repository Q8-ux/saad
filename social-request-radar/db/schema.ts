import {sqliteTable,text,primaryKey} from 'drizzle-orm/sqlite-core';
export const documents=sqliteTable('radar_documents',{
  owner:text('owner').notNull(),key:text('key').notNull(),kind:text('kind').notNull(),
  payload:text('payload').notNull(),updatedAt:text('updated_at').notNull()
},t=>[primaryKey({columns:[t.owner,t.key]})]);
