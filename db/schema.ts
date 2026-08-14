import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const analyticsDaily = sqliteTable(
  "analytics_daily",
  {
    date: text("date").notNull(),
    event: text("event").notNull(),
    device: text("device").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.date, table.event, table.device] })],
);

export const analyticsVisitors = sqliteTable(
  "analytics_visitors",
  {
    date: text("date").notNull(),
    visitorHash: text("visitor_hash").notNull(),
    device: text("device").notNull(),
  },
  (table) => [primaryKey({ columns: [table.date, table.visitorHash] })],
);

