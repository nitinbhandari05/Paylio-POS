import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/otps.json"));

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PURPOSES = new Set(["register", "forgot_password"]);
const CHANNELS = new Set(["email", "phone"]);

const normalizeChannel = (channel) => String(channel || "").trim().toLowerCase();
const normalizeTarget = (target) => String(target || "").trim().toLowerCase();

const generateCode = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const purgeExpired = (rows) =>
  rows.filter((row) => {
    if (row.usedAt) return false;
    const expiresAt = new Date(row.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  });

const OtpToken = {
  request: async ({ purpose, channel, target }) => {
    const normalizedPurpose = String(purpose || "").trim().toLowerCase();
    const normalizedChannel = normalizeChannel(channel);
    const normalizedTarget = normalizeTarget(target);

    if (!PURPOSES.has(normalizedPurpose)) throw new Error("Invalid OTP purpose");
    if (!CHANNELS.has(normalizedChannel)) throw new Error("Invalid OTP channel");
    if (!normalizedTarget) throw new Error("OTP target is required");

    const rows = purgeExpired(await store.read());
    const now = Date.now();
    const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

    const filtered = rows.filter(
      (row) =>
        !(
          row.purpose === normalizedPurpose &&
          row.channel === normalizedChannel &&
          row.target === normalizedTarget
        )
    );

    const otp = {
      _id: randomUUID(),
      purpose: normalizedPurpose,
      channel: normalizedChannel,
      target: normalizedTarget,
      code: generateCode(),
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      requestedAt: new Date(now).toISOString(),
      expiresAt,
      usedAt: null,
    };

    filtered.push(otp);
    await store.write(filtered);
    return otp;
  },

  verify: async ({ purpose, channel, target, code }) => {
    const normalizedPurpose = String(purpose || "").trim().toLowerCase();
    const normalizedChannel = normalizeChannel(channel);
    const normalizedTarget = normalizeTarget(target);
    const inputCode = String(code || "").trim();

    const rows = purgeExpired(await store.read());
    const index = rows.findIndex(
      (row) =>
        row.purpose === normalizedPurpose &&
        row.channel === normalizedChannel &&
        row.target === normalizedTarget
    );

    if (index === -1) {
      await store.write(rows);
      throw new Error("OTP not found or expired");
    }

    const otp = rows[index];
    otp.attempts = Number(otp.attempts || 0) + 1;

    if (otp.attempts > Number(otp.maxAttempts || MAX_ATTEMPTS)) {
      rows.splice(index, 1);
      await store.write(rows);
      throw new Error("OTP attempts exceeded");
    }

    if (otp.code !== inputCode) {
      rows[index] = otp;
      await store.write(rows);
      throw new Error("Invalid OTP");
    }

    otp.usedAt = new Date().toISOString();
    rows.splice(index, 1);
    await store.write(rows);
    return true;
  },
};

export default OtpToken;
