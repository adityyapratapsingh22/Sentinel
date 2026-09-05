import { createContext, useContext, useState, useCallback } from "react";
import { Api, TokenStore } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(TokenStore.getUser());

  const login = useCallback(async (email, password) => {
    const result = await Api.login(email, password);
    TokenStore.setToken(result.token);
    TokenStore.setUser(result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const result = await Api.signup(name, email, password);
    TokenStore.setToken(result.token);
    TokenStore.setUser(result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    TokenStore.clearToken();
    localStorage.removeItem("df_user");
    setUser(null);
    window.location.hash = "#/login";
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await Api.me();
    TokenStore.setUser(fresh);
    setUser(fresh);
    return fresh;
  }, []);

  const value = {
    user,
    isLoggedIn: TokenStore.isLoggedIn(),
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
