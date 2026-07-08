const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "quancy6.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    wallet_balance REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    network TEXT NOT NULL,
    label TEXT NOT NULL,
    validity TEXT NOT NULL,
    cost REAL NOT NULL,
    price REAL NOT NULL,
    variation_code TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    plan_id TEXT NOT NULL,
    network TEXT NOT NULL,
    label TEXT NOT NULL,
    phone TEXT,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    provider_ref TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed default plans on first run
const planCount = db.prepare("SELECT COUNT(*) AS c FROM plans").get().c;
if (planCount === 0) {
  // NOTE: variation_code values below are placeholders except for MTN, which
  // are the real VTpass codes at time of writing. Before going live, call
  // GET {VTPASS_BASE_URL}/service-variations?serviceID=<glo-data|airtel-data|etisalat-data>
  // and replace these with the exact codes VTpass returns for your account.
  const insert = db.prepare(`
    INSERT INTO plans (id, network, label, validity, cost, price, variation_code, active)
    VALUES (@id, @network, @label, @validity, @cost, @price, @variation_code, 1)
  `);
  const seedPlans = [
    { id: "mtn-1", network: "mtn", label: "1GB", validity: "30 days", cost: 250, price: 300, variation_code: "mtn-10mb-100" },
    { id: "mtn-2", network: "mtn", label: "2GB", validity: "30 days", cost: 480, price: 550, variation_code: "mtn-500mb-2000" },
    { id: "mtn-3", network: "mtn", label: "5GB", validity: "30 days", cost: 1150, price: 1300, variation_code: "mtn-3gb-1500" },
    { id: "mtn-4", network: "mtn", label: "10GB", validity: "30 days", cost: 2200, price: 2500, variation_code: "mtn-1gb-3500" },
    { id: "glo-1", network: "glo", label: "1.2GB", validity: "30 days", cost: 260, price: 320, variation_code: "glo-data-320" },
    { id: "glo-2", network: "glo", label: "3GB", validity: "30 days", cost: 620, price: 750, variation_code: "glo-data-750" },
    { id: "glo-3", network: "glo", label: "7GB", validity: "30 days", cost: 1400, price: 1650, variation_code: "glo-data-1650" },
    { id: "airtel-1", network: "airtel", label: "1GB", validity: "30 days", cost: 255, price: 310, variation_code: "airtel-data-310" },
    { id: "airtel-2", network: "airtel", label: "4GB", validity: "30 days", cost: 950, price: 1100, variation_code: "airtel-data-1100" },
    { id: "airtel-3", network: "airtel", label: "10GB", validity: "30 days", cost: 2250, price: 2550, variation_code: "airtel-data-
