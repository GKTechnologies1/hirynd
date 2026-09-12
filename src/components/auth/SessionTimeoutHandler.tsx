import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";

// Helper to read timeout configuration from environment variables with safe defaults
const getTimeoutConfig = (role?: string) => {
  // Use cached role from localStorage if role arg is absent (e.g. on initial page load
  // before the async /me call resolves), so recruiter timeout applies immediately.
  const effectiveRole = (role || localStorage.getItem("cached_user_role") || "").toLowerCase().trim();
  const isRecruiter = ["recruiter", "team_lead", "team_manager"].includes(effectiveRole);
  const env = import.meta.env || {};

  const timeoutMins = isRecruiter
    ? Number(env.VITE_RECRUITER_SESSION_TIMEOUT_MINUTES) || 15
    : Number(env.VITE_DEFAULT_SESSION_TIMEOUT_MINUTES) || 60;

  const warningMins = isRecruiter
    ? Number(env.VITE_RECRUITER_WARNING_MINUTES) || 2
    : Number(env.VITE_DEFAULT_WARNING_MINUTES) || 10;

  const maxTimeoutMs = timeoutMins * 60 * 1000;
  const warningTimeoutMs = Math.max(0, (timeoutMins - warningMins) * 60 * 1000);
  const warningWindowSeconds = warningMins * 60;

  return { maxTimeoutMs, warningTimeoutMs, warningWindowSeconds };
};

const CHECK_INTERVAL = 1000;

export const SessionTimeoutHandler = () => {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const isLoggingOutRef = useRef(false);
  const showWarningRef = useRef(false);

  const { maxTimeoutMs, warningTimeoutMs, warningWindowSeconds } = getTimeoutConfig(user?.role);

  const performAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarning(false);
    try {
      await signOut("auto_logout_inactivity");
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [signOut]);

  const checkSessionState = useCallback((): boolean => {
    if (isLoggingOutRef.current || !user) return false;

    const storedTimestamp = localStorage.getItem("last_activity_timestamp");
    const lastActivity = Number(storedTimestamp || Date.now());
    const elapsed = Date.now() - lastActivity;

    if (elapsed >= maxTimeoutMs) {
      performAutoLogout();
      return true; // Expired
    } else if (elapsed >= warningTimeoutMs) {
      showWarningRef.current = true;
      setShowWarning(true);
      setTimeLeft(Math.max(0, Math.ceil((maxTimeoutMs - elapsed) / 1000)));
      return false;
    } else {
      showWarningRef.current = false;
      setShowWarning(false);
      return false;
    }
  }, [user, maxTimeoutMs, warningTimeoutMs, performAutoLogout]);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    if (!localStorage.getItem("last_activity_timestamp")) {
      localStorage.setItem("last_activity_timestamp", Date.now().toString());
    }

    // Initial check on mount
    checkSessionState();

    let lastThrottleTime = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Only throttle writes every 4 seconds
      if (now - lastThrottleTime < 4000) return;
      lastThrottleTime = now;

      // CRITICAL: Before recording new activity, verify the session hasn't already timed out!
      // If elapsed time is >= maxTimeoutMs, do NOT record new activity; log out immediately.
      const storedTimestamp = localStorage.getItem("last_activity_timestamp");
      const lastActivity = Number(storedTimestamp || now);
      if (now - lastActivity >= maxTimeoutMs) {
        performAutoLogout();
        return;
      }

      localStorage.setItem("last_activity_timestamp", now.toString());
      if (showWarningRef.current) {
        showWarningRef.current = false;
        setShowWarning(false);
      }
    };

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Re-verify immediately when tab gains focus or becomes visible
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkSessionState();
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // Main periodic check interval
    const interval = setInterval(() => {
      checkSessionState();
    }, CHECK_INTERVAL);

    // Cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token" && !e.newValue) {
        signOut();
      } else if (e.key === "last_activity_timestamp") {
        checkSessionState();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  // NOTE: showWarning intentionally excluded — tracked via showWarningRef to
  // avoid re-running this entire effect (and re-attaching all listeners) every
  // time the warning dialog toggles.
  }, [user, maxTimeoutMs, warningTimeoutMs, checkSessionState, performAutoLogout, signOut]);

  const handleExtendSession = async () => {
    localStorage.setItem("last_activity_timestamp", Date.now().toString());
    setShowWarning(false);
    try {
      await authApi.me();
    } catch (err) {
      console.error("Failed to extend session", err);
    }
  };

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[420px] bg-background/95 backdrop-blur-md border-border/80 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-3 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center animate-pulse border border-amber-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm max-w-[320px]">
            Your session is about to expire due to inactivity. You will be automatically logged out in:
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-2 text-3xl font-mono font-bold tracking-widest text-amber-500 bg-amber-500/5 px-6 py-3 rounded-lg border border-amber-500/10 w-fit">
            <Clock className="h-6 w-6 animate-spin-slow text-amber-500" />
            <span>{Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}{timeLeft % 60}</span>
          </div>

          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, (timeLeft / (warningWindowSeconds || 1)) * 100))}%` }}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => signOut("user_logout")}
            className="w-full sm:w-auto hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
          >
            Logout
          </Button>
          <Button
            type="button"
            onClick={handleExtendSession}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all shadow-md shadow-amber-500/10 hover:shadow-amber-500/20"
          >
            Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

