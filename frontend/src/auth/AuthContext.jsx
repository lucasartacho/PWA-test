import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { db } from "../db.js";

const AuthContext = createContext(null);
const SESSION_ID = "current";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    db.session.get(SESSION_ID).then((stored) => setSession(stored ?? null));
  }, []);

  const login = useCallback(async ({ access, refresh }) => {
    const record = { id: SESSION_ID, access, refresh };
    await db.session.put(record);
    setSession(record);
  }, []);

  const logout = useCallback(async () => {
    await db.session.delete(SESSION_ID);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
