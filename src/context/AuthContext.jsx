import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { setToken, clearToken, getToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  // Managers and owners can switch property; everyone else is pinned to theirs.
  const [location, setLocation] = useState("exclusive");

  useEffect(() => {
    (async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const { user: u, permissions: p } = await api.me();
        setUser(u);
        setPermissions(p);
        setLocation(u.location === "all" ? "exclusive" : u.location);
      } catch {
        clearToken();
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const bounce = () => { setUser(null); setPermissions([]); };
    window.addEventListener("divic:signed-out", bounce);
    return () => window.removeEventListener("divic:signed-out", bounce);
  }, []);

  const signIn = useCallback(async (username, password) => {
    const { token, user: u, permissions: p } = await api.login(username, password);
    setToken(token);
    setUser(u);
    setPermissions(p);
    setLocation(u.location === "all" ? "exclusive" : u.location);
    return u;
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setPermissions([]);
  }, []);

  const can = useCallback((key) => permissions.includes(key), [permissions]);
  const canSwitchLocation = user?.location === "all";

  return (
    <AuthContext.Provider value={{
      user, permissions, loading, can,
      location, setLocation, canSwitchLocation,
      signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
