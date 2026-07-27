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

// Inactivity timeouts in milliseconds
const WARNING_TIMEOUT = 50 * 60 * 1000; // 50 minutes of inactivity triggers warning
const MAX_TIMEOUT = 60 * 60 * 1000;     // 60 minutes (1 hour) of inactivity forces logout
const CHECK_INTERVAL = 1000;            // Check state every second

export const SessionTimeoutHandler = () => {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes warning window (600 seconds)
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    // Set initial activity timestamp if not set
    if (!localStorage.getItem("last_activity_timestamp")) {
      localStorage.setItem("last_activity_timestamp", Date.now().toString());
    }

    // Throttle activity updates (max once every 5 seconds)
    let lastUpdate = 0;
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 5000) {
        lastUpdate = now;
        localStorage.setItem("last_activity_timestamp", now.toString());
      }
    };

    // User interaction events to track activity
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Main interval logic to verify session validity
    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const lastActivity = Number(localStorage.getItem("last_activity_timestamp") || Date.now());
      const now = Date.now();
      const elapsed = now - lastActivity;

      if (elapsed >= MAX_TIMEOUT) {
        isLoggingOutRef.current = true;
        clearInterval(interval);
        signOut().then(() => {
          isLoggingOutRef.current = false;
        });
      } else if (elapsed >= WARNING_TIMEOUT) {
        setShowWarning(true);
        const secondsRemaining = Math.max(0, Math.ceil((MAX_TIMEOUT - elapsed) / 1000));
        setTimeLeft(secondsRemaining);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL);

    // Sync state: if access_token is removed (e.g. by logging out on another tab), log out this tab too
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token" && !e.newValue) {
        signOut();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user, signOut]);

  const handleExtendSession = async () => {
    // Reset activity timer
    localStorage.setItem("last_activity_timestamp", Date.now().toString());
    setShowWarning(false);
    try {
      // Ping backend to reset backend last_activity timestamp & refresh token if near expiry
      await authApi.me();
    } catch (err) {
      console.error("Failed to extend session via API ping", err);
    }
  };

  const handleLogout = () => {
    signOut();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Dialog open={showWarning} onOpenChange={(open) => {
      if (!open) {
        // Prevent closing the modal on overlay click or Escape key
        return;
      }
    }}>
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
            <span>{formatTime(timeLeft)}</span>
          </div>
          
          {/* Visual Progress Bar */}
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 600) * 100}%` }}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
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
