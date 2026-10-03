import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Use: npm run db:seed-admin (reads .env.local)");
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error('Set a password, e.g. ADMIN_PASSWORD="your-strong-password" npm run db:seed-admin');
  process.exit(1);
}

const sql = neon(url);
const hash = await bcrypt.hash(password, 10);

await sql`DELETE FROM admins`;
await sql`INSERT INTO admins (password_hash) VALUES (${hash})`;

console.log("Admin password seeded (single admin account).");
