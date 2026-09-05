import Dexie from "dexie";

export const db = new Dexie("pwa-test");

db.version(1).stores({
  diagnostics: "++id, checkedAt",
});
