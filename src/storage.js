const CONNECTIONS = "nexvnc.connections.v1";
const PREFERENCES = "nexvnc.preferences.v1";
export const defaults = { scale: true, viewOnly: false };
let nativeSnapshot = null;
export async function initializeStorage() {
  if (window.nexvncStorage) nativeSnapshot = await window.nexvncStorage.read();
  else {
    // Preserve the local library created under the development codename.
    for (const [current, previous] of [
      [CONNECTIONS, "luma.connections.v1"],
      [PREFERENCES, "luma.preferences.v1"],
    ]) {
      if (
        localStorage.getItem(current) === null &&
        localStorage.getItem(previous) !== null
      ) {
        localStorage.setItem(current, localStorage.getItem(previous));
      }
    }
  }
}
export function loadConnections() {
  try {
    const data = nativeSnapshot
      ? nativeSnapshot.connections
      : JSON.parse(localStorage.getItem(CONNECTIONS) || "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (c) =>
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          typeof c.host === "string" &&
          Number.isInteger(c.port) &&
          c.port > 0 &&
          c.port <= 65535,
      )
      .map(({ id, name, host, port, kind, favorite, lastConnected }) => ({
        id,
        name,
        host,
        port,
        kind: ["linux", "mac", "windows", "other"].includes(kind)
          ? kind
          : "other",
        favorite: !!favorite,
        lastConnected: typeof lastConnected === "number" ? lastConnected : 0,
      }));
  } catch {
    return [];
  }
}
export function saveConnections(connections) {
  const cleaned = connections.map(
    ({ id, name, host, port, kind, favorite, lastConnected }) => ({
      id,
      name,
      host,
      port,
      kind,
      favorite,
      lastConnected,
    }),
  );
  if (window.nexvncStorage)
    return window.nexvncStorage.saveConnections(cleaned);
  localStorage.setItem(CONNECTIONS, JSON.stringify(cleaned));
}
export function loadPreferences() {
  try {
    const data = nativeSnapshot
      ? nativeSnapshot.preferences
      : JSON.parse(localStorage.getItem(PREFERENCES) || "{}");
    return { scale: data.scale !== false, viewOnly: data.viewOnly === true };
  } catch {
    return defaults;
  }
}
export function savePreferences(value) {
  const cleaned = { scale: !!value.scale, viewOnly: !!value.viewOnly };
  if (window.nexvncStorage)
    return window.nexvncStorage.savePreferences(cleaned);
  localStorage.setItem(PREFERENCES, JSON.stringify(cleaned));
}
export function address(connection) {
  return `${connection.host.includes(":") ? `[${connection.host}]` : connection.host}:${connection.port}`;
}
