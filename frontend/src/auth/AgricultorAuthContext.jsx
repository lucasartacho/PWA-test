import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { db } from "../db.js";

const AgricultorAuthContext = createContext(null);
const SESSION_ID = "current";

export function AgricultorAuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    db.agricultorSession
      .get(SESSION_ID)
      .then((stored) => setSession(stored ?? null))
      .catch(() => setSession(null));
  }, []);

  const login = useCallback(async ({ token }) => {
    const record = { id: SESSION_ID, token };
    await db.agricultorSession.put(record);
    setSession(record);
  }, []);

  const logout = useCallback(async () => {
    await db.agricultorSession.delete(SESSION_ID);
    setSession(null);
  }, []);

  return (
    <AgricultorAuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AgricultorAuthContext.Provider>
  );
}

export function useAgricultorAuth() {
  const ctx = useContext(AgricultorAuthContext);
  if (!ctx) {
    throw new Error("useAgricultorAuth deve ser usado dentro de AgricultorAuthProvider");
  }
  return ctx;
}
