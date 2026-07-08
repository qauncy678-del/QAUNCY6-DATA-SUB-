const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

/**
 * Delivers a data bundle to a phone number.
 * Returns { success: boolean, ref: string, raw: any }
 *
 * Set DATA_PROVIDER=mock in .env to simulate delivery (default, safe for testing).
 * Set DATA_PROVIDER=vtpass to call the real VTpass API (requires API keys).
 */
async function deliverData({ plan, phone }) {
  const provider = process.env.DATA_PROVIDER || "mock";
  if (provider === "vtpass") {
    return deliverViaVtpass({ plan, phone });
  }
  return deliverViaMock({ plan, phone });
}

// ---------------------------------------------------------------------------
// Mock provider: no external calls, no real data is sent. Mirrors VTpass's
// own sandbox convention so you can rehearse success/fail flows before
// wiring a real provider.
// ---------------------------------------------------------------------------
async function deliverViaMock({ phone }) {
  await new Promise((r) => setTimeout(r, 400)); // simulate network latency
  const ref = `MOCK-${Date.now()}`;
  if (phone && phone.startsWith("0800")) {
    return { success: false, ref, raw: { note: "Simulated failure for test number" } };
  }
  return { success: true, ref, raw: { note: "Simulated delivery" } };
}

// ---------------------------------------------------------------------------
// VTpass provider: calls the real VTpass "Buying Services" API.
// Docs: https://vtpass.com/documentation/mtn-data/ (same shape for all networks)
// Auth: api-key + secret-key headers (see https://vtpass.com/documentation/authentication/)
// ---------------------------------------------------------------------------
async function deliverViaVtpass({ plan, phone }) {
  const baseURL = process.env.VTPASS_BASE_URL || "https://sandbox.vtpass.com/api";
  const serviceIdMap = { mtn: "mtn-data", glo: "glo-data", airtel: "airtel-data", "9mobile": "etisalat-data" };
  const serviceID = serviceIdMap[plan.network];
  if (!serviceID) return { success: false, ref: null, raw: { error: `Unknown network ${plan.network}` } };
  if (!plan.variation_code) return { success: false, ref: null, raw: { error: "Plan is missing a variation_code" } };

  const request_id = uuidv4().replace(/-/g, "").slice(0, 20);

  try {
    const { data } = await axios.post(
      `${baseURL}/pay`,
      {
        request_id,
        serviceID,
        billersCode: phone,
        variation_code: plan.variation_code,
        phone,
      },
      {
        headers: {
          "api-key": process.env.VTPASS_API_KEY,
          "secret-key": process.env.VTPASS_SECRET_KEY,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const status = data?.content?.transactions?.status;
    const success = data.code === "000" && (status === "delivered" || status === "successful");
    return { success, ref: data.requestId || request_id, raw: data };
  } catch (err) {
    return { success: false, ref: request_id, raw: err.response?.data || { error: err.message } };
  }
}

module.exports = { deliverData };
