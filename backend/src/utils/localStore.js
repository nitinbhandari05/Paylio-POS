import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const ensureFile = async (filePath, defaultValue = "[]\n") => {
  await mkdir(dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(filePath, defaultValue, "utf8");
      return;
    }

    throw error;
  }
};

export const createArrayStore = (filePath) => ({
  read: async () => {
    await ensureFile(filePath);

    const raw = await readFile(filePath, "utf8");
    const data = raw.trim() ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  },
  write: async (items) => {
    await ensureFile(filePath);
    await writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  },
});
