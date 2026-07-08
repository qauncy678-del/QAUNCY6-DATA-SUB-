require("dotenv").config();
const express = require("express");
const cors = require("cors");

require("./db"); // initializes schema, seeds plans + admin on first boot

const authRoutes = require("./routes/auth");
const planRoutes = require("./routes/plans");
const walletRoutes = require("./routes/wallet");
const transactionRoutes = require("./routes/transactions");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`QUANCY6 API listening on http://localhost:${port}`);
});
