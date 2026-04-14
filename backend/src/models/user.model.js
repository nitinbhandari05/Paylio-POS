import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = resolve(__dirname, "../../data");
const usersFile = resolve(dataDir, "users.json");

const ensureStore = async () => {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(usersFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(usersFile, "[]\n", "utf8");
      return;
    }

    throw error;
  }
};

const readUsers = async () => {
  await ensureStore();

  const raw = await readFile(usersFile, "utf8");
  const users = raw.trim() ? JSON.parse(raw) : [];
  return Array.isArray(users) ? users : [];
};

const writeUsers = async (users) => {
  await ensureStore();
  await writeFile(usersFile, `${JSON.stringify(users, null, 2)}\n`, "utf8");
};

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const User = {
  findOne: async (query = {}) => {
    const users = await readUsers();

    if (query.email) {
      const email = normalizeEmail(query.email);
      return users.find((user) => normalizeEmail(user.email) === email) || null;
    }

    if (query._id) {
      return users.find((user) => user._id === String(query._id)) || null;
    }

    return users.find((user) =>
      Object.entries(query).every(([key, value]) => user[key] === value)
    ) || null;
  },

  create: async (payload) => {
    const users = await readUsers();
    const email = normalizeEmail(payload.email);

    if (users.some((user) => normalizeEmail(user.email) === email)) {
      throw new Error("User already exists");
    }

    const now = new Date().toISOString();
    const user = {
      _id: randomUUID(),
      name: payload.name?.trim() || "",
      email,
      password: payload.password,
      role: payload.role || "user",
      createdAt: now,
      updatedAt: now,
    };

    users.push(user);
    await writeUsers(users);

    return user;
  },
};

export default User;
