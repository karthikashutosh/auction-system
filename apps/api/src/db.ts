import { Pool } from "pg";

export const db = new Pool({
  host: "localhost",
  port: 5432,
  user: "karthikselvam",
  password: "Kasel@cooper0304",
  database: "auction_db",
});
