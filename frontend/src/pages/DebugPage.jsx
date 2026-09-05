import { useEffect, useState } from "react";
import { checkHealth } from "../api.js";
import { db } from "../db.js";

export default function DebugPage() {
  const [health, setHealth] = useState(null);
  const [dexieOk, setDexieOk] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));

    db.diagnostics
      .add({ checkedAt: new Date().toISOString() })
      .then(() => db.diagnostics.count())
      .then((count) => setDexieOk(count > 0))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main>
      <h1>PWA Test — Diagnóstico da Fundação</h1>
      {error && <p>Erro: {error}</p>}
      <p>Backend: {health?.status === "ok" ? "conectado ✅" : "verificando..."}</p>
      <p>Banco: {health?.db === "connected" ? "conectado ✅" : "verificando..."}</p>
      <p>Armazenamento local (Dexie): {dexieOk ? "funcionando ✅" : "verificando..."}</p>
    </main>
  );
}
