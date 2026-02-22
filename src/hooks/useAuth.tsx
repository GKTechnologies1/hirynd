import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "candidate" | "recruiter" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  approvalStatus: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) console.error("Failed to fetch roles:", error.message);
      setRoles((data || []).map((r: any) => r.role as AppRole));
    } catch (e) {
      console.error("Exception fetching roles:", e);
      setRoles([]);
    }
  };

  const fetchApprovalStatus = async (userId: string, retry = true) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("user_id", userId)
        .single();
      if (error) {
        console.error("Failed to fetch approval status:", error.message);
        // Retry once after a short delay
        if (retry) {
          await new Promise(r => setTimeout(r, 1000));
          return fetchApprovalStatus(userId, false);
        }
      }
      setApprovalStatus(data?.approval_status || "pending_approval");
    } catch (e) {
      console.error("Exception fetching approval status:", e);
      setApprovalStatus("pending_approval");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchRoles(session.user.id);
            fetchApprovalStatus(session.user.id);
          }, 0);
        } else {
          setRoles([]);
          setApprovalStatus(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
        fetchApprovalStatus(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    if (error) return { error };
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setApprovalStatus(null);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, approvalStatus, signUp, signIn, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
