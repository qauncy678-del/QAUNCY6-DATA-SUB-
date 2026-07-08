const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { deliverData } = require("../services/dataProvider");

const router = express.Router();

// Atomically checks balance and debits it. Throws if insufficient funds.
const debitIfAffordable = db.transaction((userId, amount) => {
  const user = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(userId);
  if (!user || user.wallet_balance < amount) {
    throw new Error("INSUFFICIENT_FUNDS");
  }
  db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(amount, userId);
});

router.post("/purchase", requireAuth, async (req, res) => {
  const { planId, phone } = req.body || {};
  if (!planId || !phone) return res.status(400).json({ error: "planId and phone are required" });

  const plan = db.prepare("SELECT * FROM plans WHERE id = ? AND active = 1").get(planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  const txId = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  try {
    debitIfAffordable(req.user.id, plan.price);
  } catch (err) {
    db.prepare(`
      INSERT INTO transactions (id, user_id, plan_id, network, label, phone, amount, status, provider_ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Failed', 'insufficient_funds')
    `).run(txId, req.user.id, plan.id, plan.network, `${plan.label} / ${plan.validity}`, phone, plan.price);
    return res.status(402).json({ error: "Insufficient wallet balance", transaction: { id: txId, status: "Failed" } });
  }

  // Wallet has been debited. Record a pending transaction, then attempt delivery.
  db.prepare(`
    INSERT INTO transactions (id, user_id, plan_id, network, label, phone, amount, status, provider_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', NULL)
  `).run(txId, req.user.id, plan.id, plan.network, `${plan.label} / ${plan.validity}`, phone, plan.price);

  const delivery = await deliverData({ plan, phone });

  if (delivery.success) {
    db.prepare("UPDATE transactions SET status = 'Successful', provider_ref = ? WHERE id = ?").run(delivery.ref, txId);
  } else {
    // Delivery failed after debit -> refund the wallet.
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(plan.price, req.user.id);
    db.prepare("UPDATE transactions SET status = 'Failed', provider_ref = ? WHERE id = ?").run(delivery.ref, txId);
  }

  const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(txId);
  const user = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id);
  res.json({ transaction, balance: user.wallet_balance, providerDetail: delivery.raw });
});

router.get("/", requireAuth, (req, res) => {
  const transactions = db
    .prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100")
    .all(req.user.id);
  res.json({ transactions });
});

router.get("/all", requireAuth, requireAdmin, (req, res) => {
  const transactions = db
    .prepare(`
      SELECT t.*, u.email AS user_email FROM transactions t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC LIMIT 200
    `)
    .all();
  res.json({ transactions });
});

module.exports = router;
