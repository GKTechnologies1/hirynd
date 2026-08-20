import React, { useEffect, useState, useRef } from "react";
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
  const isRecruiter = role === "recruiter";
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

  const { maxTimeoutMs, warningTimeoutMs, warningWindowSeconds } = getTimeoutConfig(user?.role);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    if (!localStorage.getItem("last_activity_timestamp")) {
      localStorage.setItem("last_activity_timestamp", Date.now().toString());
    }

    let lastUpdate = 0;
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 5000) {
        lastUpdate = now;
        localStorage.setItem("last_activity_timestamp", now.toString());
      }
    };

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const lastActivity = Number(localStorage.getItem("last_activity_timestamp") || Date.now());
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= maxTimeoutMs) {
        isLoggingOutRef.current = true;
        clearInterval(interval);
        signOut("auto_logout_inactivity").then(() => {
          isLoggingOutRef.current = false;
        });
      } else if (elapsed >= warningTimeoutMs) {
        setShowWarning(true);
        setTimeLeft(Math.max(0, Math.ceil((maxTimeoutMs - elapsed) / 1000)));
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token" && !e.newValue) {
        signOut();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, updateActivity));
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user, signOut, maxTimeoutMs, warningTimeoutMs]);

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
