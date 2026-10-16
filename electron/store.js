import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

function sanitizeConnections(value) {
  if (!Array.isArray(value) || value.length > 1000)
    throw new Error("Biblioteca inválida.");
  return value.map((item) => {
    if (
      !item ||
      typeof item.id !== "string" ||
      item.id.length > 100 ||
      typeof item.name !== "string" ||
      item.name.length > 80 ||
      typeof item.host !== "string" ||
      item.host.length > 253 ||
      !Number.isInteger(item.port) ||
      item.port < 1 ||
      item.port > 65535
    )
      throw new Error("Conexión inválida.");
    return {
      id: item.id,
      name: item.name,
      host: item.host,
      port: item.port,
      kind: ["windows", "mac", "linux", "other"].includes(item.kind)
        ? item.kind
        : "other",
      favorite: !!item.favorite,
      lastConnected: Number.isFinite(item.lastConnected)
        ? item.lastConnected
        : 0,
    };
  });
}

export function createStore(directory) {
  const filename = path.join(directory, "library.json");
  let writes = Promise.resolve();
  async function read() {
    try {
      const text = await readFile(filename, "utf8");
      if (text.length > 1024 * 1024)
        throw new Error("La biblioteca supera el tamaño permitido.");
      const data = JSON.parse(text);
      return {
        connections: sanitizeConnections(data.connections),
        preferences: {
          scale: data.preferences?.scale !== false,
          viewOnly: data.preferences?.viewOnly === true,
        },
      };
    } catch (error) {
      if (error.code === "ENOENT")
        return {
          connections: [],
          preferences: { scale: true, viewOnly: false },
        };
      throw error;
    }
  }
  function save(key, value) {
    const operation = writes
      .catch(() => {})
      .then(async () => {
        if (!["connections", "preferences"].includes(key))
          throw new Error("Clave no permitida.");
        const cleaned =
          key === "connections"
            ? sanitizeConnections(value)
            : {
                scale: value?.scale !== false,
                viewOnly: value?.viewOnly === true,
              };
        const data = await read();
        data[key] = cleaned;
        await mkdir(directory, { recursive: true });
        await writeFile(
          filename + ".tmp",
          JSON.stringify(data, null, 2),
          "utf8",
        );
        await rename(filename + ".tmp", filename);
      });
    writes = operation;
    return operation;
  }
  return { read, save, flush: () => writes };
}
