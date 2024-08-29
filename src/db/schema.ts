import { pgTable, uuid, integer, boolean, text } from "drizzle-orm/pg-core";

export const measure = pgTable("measure", {
  id: uuid("id").defaultRandom().primaryKey(),
  customer_code: text("customer_code").notNull(),
  measure_datetime: text("measure_datetime").notNull(),
  measure_type: text("measure_type"),
  measure_value: integer("measure_value"),
  has_confirmed: boolean("has_confirmed").default(false),
  image_url: text("image_url"),
});
