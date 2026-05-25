import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { get, post } from "@/lib/api";

export type User = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  photos?: string[];
  dob?: string;
  gender?: string;
  city?: string;
  verified?: boolean;
  level?: number;
  xp?: number;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (phone: string, otp: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  exchangeClerkToken: (sessionToken: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,
  signIn: async () => false,
  signOut: async () => {},
  exchangeClerkToken: async () => false,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      const t = await AsyncStorage.getItem("token");
      return t;
    });
  }, []);

  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {}
        }
        try {
          const data: any = await get("/api/user/me");
          const u = data?.user || data;
          if (u && u.id) {
            setUser(u);
            await AsyncStorage.setItem("user", JSON.stringify(u));
          }
        } catch {
          // Token may be invalid, but keep it for retry
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (phone: string, otp: string): Promise<boolean> => {
    try {
      const data: any = await post("/api/auth/verify-otp", { phone, otp });
      if (data?.token) {
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const exchangeClerkToken = useCallback(async (sessionToken: string): Promise<boolean> => {
    try {
      const data: any = await post("/api/auth/clerk-exchange", { sessionToken });
      if (data?.token) {
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data: any = await get("/api/user/me");
      const u = data?.user || data;
      if (u && u.id) {
        setUser(u);
        await AsyncStorage.setItem("user", JSON.stringify(u));
      }
    } catch {
      // ignore
    }
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        user,
        token,
        isLoading,
        signIn,
        signOut,
        exchangeClerkToken,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
