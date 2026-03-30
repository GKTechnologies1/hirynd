import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/services/api";

type AppRole = "candidate" | "recruiter" | "team_lead" | "team_manager" | "admin" | "finance_admin";

interface UserData {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: AppRole;
  approval_status: string;
  created_at: string;
  profile?: {
    id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; approval_status?: string; user?: UserData }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role = "candidate") => {
    try {
      await authApi.register({ email, password, full_name: fullName, role });
      return { error: null };
    } catch (err: any) {
      return { error: err.response?.data || err.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      setUser(data.user);
      return { error: null, user: data.user };
    } catch (err: any) {
      const errData = err.response?.data;
      if (err.response?.status === 403) {
        return { error: errData?.error || "Account not approved", approval_status: errData?.approval_status };
      }
      return { error: errData?.error || err.message };
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  const hasRole = (role: AppRole) => {
    if (!user) return false;
    // Team manager can access recruiter views
    if (role === "recruiter" && ["recruiter", "team_lead", "team_manager"].includes(user.role)) return true;
    return user.role === role;
  };

  const refreshUser = fetchUser;

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
