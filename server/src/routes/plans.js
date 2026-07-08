const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  const plans = db.prepare("SELECT * FROM plans WHERE active = 1 ORDER BY network, price").all();
  res.json({ plans });
});

// Admin: full list including inactive plans
router.get("/all", requireAuth, requireAdmin, (req, res) => {
  const plans = db.prepare("SELECT * FROM plans ORDER BY network, price").all();
  res.json({ plans });
});

router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { network, label, validity, cost, price, variation_code } = req.body || {};
  if (!network || !label || cost == null || price == null) {
    return res.status(400).json({ error: "network, label, cost and price are required" });
  }
  const id = `${network}-${Date.now()}`;
  db.prepare(`
    INSERT INTO plans (id, network, label, validity, cost, price, variation_code, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, network, label, validity || "30 days", Number(cost), Number(price), variation_code || null);
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(id);
  res.status(201).json({ plan });
});

router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM plans WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Plan not found" });
  const { label, validity, cost, price, variation_code, active } = req.body || {};
  db.prepare(`
    UPDATE plans SET
      label = COALESCE(?, label),
      validity = COALESCE(?, validity),
      cost = COALESCE(?, cost),
      price = COALESCE(?, price),
      variation_code = COALESCE(?, variation_code),
      active = COALESCE(?, active)
    WHERE id = ?
  `).run(
    label ?? null,
    validity ?? null,
    cost != null ? Number(cost) : null,
    price != null ? Number(price) : null,
    variation_code ?? null,
    active != null ? (active ? 1 : 0) : null,
    req.params.id
  );
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(req.params.id);
  res.json({ plan });
});

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  db.prepare("DELETE FROM plans WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

module.exports = router;
