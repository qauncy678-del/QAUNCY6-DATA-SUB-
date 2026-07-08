const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const user = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id);
  res.json({ balance: user.wallet_balance });
});

// NOTE: this is a placeholder that credits the wallet directly. It stands in
// for a real payment flow. Before going live, replace this with:
//   1. Initialize a payment (e.g. Paystack/Flutterwave "initialize transaction")
//      from the client, redirect the user to the provider's checkout.
//   2. Verify the payment server-side using the provider's "verify transaction"
//      endpoint (or their webhook) BEFORE crediting the wallet.
// Never trust a client-supplied "amount paid" without verifying it with the
// payment provider first, or users could credit themselves for free.
router.post("/topup", requireAuth, (req, res) => {
  const { amount } = req.body || {};
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "A positive amount is required" });

  db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(amt, req.user.id);
  const user = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id);
  res.json({ balance: user.wallet_balance });
});

module.exports = router;
