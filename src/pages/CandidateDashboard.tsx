import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, notificationsApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CandidateTimeline from "@/components/dashboard/CandidateTimeline";
import StatusBadge from "@/components/dashboard/StatusBadge";
import CandidateIntakePage from "@/pages/candidate/CandidateIntakePage";
import CandidateRolesPage from "@/pages/candidate/CandidateRolesPage";
import CandidateCredentialsPage from "@/pages/candidate/CandidateCredentialsPage";
import CandidatePaymentsPage from "@/pages/candidate/CandidatePaymentsPage";
import CandidateBillingPage from "@/pages/candidate/CandidateBillingPage";
import CandidateApplicationsPage from "@/pages/candidate/CandidateApplicationsPage";
import CandidateInterviewsPage from "@/pages/candidate/CandidateInterviewsPage";
import CandidateReferralsPage from "@/pages/candidate/CandidateReferralsPage";
import CandidateSettingsPage from "@/pages/candidate/CandidateSettingsPage";
import CandidateMessagesPage from "@/pages/candidate/CandidateMessagesPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, FileText, Briefcase, Users, Calendar, UserPlus,
  ClipboardList, Bell, DollarSign, KeyRound, Phone, Award, CreditCard,
  AlertTriangle, MessageSquare, Settings, Lock,
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Sheet", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Billing", path: "/candidate-dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Phone className="h-4 w-4" /> },
  { label: "Referral", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Messages", path: "/candidate-dashboard/messages", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Settings", path: "/candidate-dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

// Status pipeline gating per spec Section 4.1
const STATUS_TAB_ACCESS: Record<string, string[]> = {
  pending_approval:     ["overview"],
  lead:                 ["overview"],
  approved:             ["overview", "intake"],
  intake_submitted:     ["overview", "intake"],
  roles_suggested:      ["overview", "intake", "roles"],
  roles_confirmed:      ["overview", "intake", "roles", "payments"],
  paid:                 ["overview", "intake", "roles", "payments"],
  credential_completed: ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews"],
  active_marketing:     ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  paused:               ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  on_hold:              ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  past_due:             ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  cancelled:            ["overview"],
  placed:               ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
};

const LOCKED_MESSAGES: Record<string, { title: string; reason: string; action?: string; actionPath?: string }> = {
  intake: { title: "Intake Sheet", reason: "Complete your intake sheet to proceed with the onboarding process.", action: "Go to Intake →", actionPath: "/candidate-dashboard/intake" },
  roles: { title: "Roles", reason: "Role suggestions will appear here once your intake has been reviewed. Please allow 24–48 hours after intake submission." },
  credentials: { title: "Credentials", reason: "Credentials will unlock after role confirmation and the required payment step.", action: "Go to Payments →", actionPath: "/candidate-dashboard/payments" },
  payments: { title: "Payments", reason: "Complete your role confirmation step to unlock payments." },
  billing: { title: "Billing", reason: "Your billing information will be available after payment is completed." },
  applications: { title: "Applications", reason: "Applications tracking will be available after your credentials are submitted." },
  interviews: { title: "Interviews", reason: "Interview tracking will be available after your credentials are submitted." },
  referrals: { title: "Referrals", reason: "Referral program will be available once your profile is active." },
  messages: { title: "Messages", reason: "Group chat will be available once a recruiter is assigned to your profile." },
};

const LockedTab = ({ tab }: { tab: string }) => {
  const info = LOCKED_MESSAGES[tab] || { title: "Locked", reason: "This section is not available yet." };
  return (
    <DashboardLayout title={info.title} navItems={navItems}>
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="py-12 text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground">{info.title}</h3>
          <p className="text-sm text-muted-foreground mt-2">{info.reason}</p>
          {info.action && info.actionPath && (
            <Button variant="hero" className="mt-4" onClick={() => window.location.href = info.actionPath!}>
              {info.action}
            </Button>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

const TrainingButton = ({ candidate, type, label }: { candidate: any; type: string; label: string }) => {
  const handleClick = () => {
    window.open("https://cal.com/hyrind", "_blank");
  };
  return (
    <Button variant="outline" className="justify-start" onClick={handleClick}>
      <Calendar className="mr-2 h-4 w-4" /> {label}
    </Button>
  );
};

const CandidateDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [candidate, setCandidate] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Use /candidates/me/ — auto-creates the Candidate record if missing
      const { data: cand } = await candidatesApi.me();
      setCandidate(cand);
      try {
        const { data: notifs } = await notificationsApi.list(true);
        setNotifications(notifs?.slice(0, 10) || []);
      } catch { /* ignore */ }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  if (loading) return <DashboardLayout title="Dashboard" navItems={navItems}><p>Loading...</p></DashboardLayout>;

  const status = candidate?.status || "pending_approval";
  const allowedTabs = STATUS_TAB_ACCESS[status] || ["overview"];
  const subPath = location.pathname.replace("/candidate-dashboard", "").replace(/^\//, "") || "overview";

  // Check if the tab is accessible
  const tabKey = subPath === "" ? "overview" : subPath;
  if (tabKey !== "overview" && !allowedTabs.includes(tabKey)) {
    return <LockedTab tab={tabKey} />;
  }

  // Sub-routing
  if (subPath === "intake") return <CandidateIntakePage candidate={candidate} onStatusChange={fetchData} />;
  if (subPath === "roles") return <CandidateRolesPage candidate={candidate} onStatusChange={fetchData} />;
  if (subPath === "credentials") return <CandidateCredentialsPage candidate={candidate} onStatusChange={fetchData} />;
  if (subPath === "payments") return <CandidatePaymentsPage candidate={candidate} onStatusChange={fetchData} />;
  if (subPath === "billing") return <CandidateBillingPage candidate={candidate} />;
  if (subPath === "applications") return <CandidateApplicationsPage candidate={candidate} />;
  if (subPath === "interviews") return <CandidateInterviewsPage candidate={candidate} />;
  if (subPath === "referrals") return <CandidateReferralsPage candidate={candidate} />;
  if (subPath === "settings") return <CandidateSettingsPage />;
  if (subPath === "messages") return <CandidateMessagesPage />;

  const getNextAction = () => {
    switch (status) {
      case "pending_approval": return "Your registration is under review. We'll notify you within 24–48 hours.";
      case "lead":              return "Your account has been noted. Awaiting full approval.";
      case "approved":          return "Complete your Client Intake Sheet to proceed.";
      case "intake_submitted":  return "Your intake is under review. Waiting for role suggestions from your team.";
      case "roles_suggested":   return "Review and respond to your suggested roles.";
      case "roles_confirmed":   return "Your roles are confirmed. Waiting for payment step.";
      case "paid":              return "Payment received. Submit your credential intake sheet.";
      case "credential_completed": return "Your credentials are submitted. Waiting for recruiter assignment.";
      case "active_marketing":  return "Your profile is being actively marketed!";
      case "placed":            return "🎉 Congratulations! You've been placed.";
      case "paused":            return "Your case is currently paused. Contact support for details.";
      case "on_hold":           return "Your case is on hold pending review.";
      case "past_due":          return "Payment past due. Please update your billing.";
      case "cancelled":         return "Your case has been cancelled. Contact support for details.";
      default:                  return "Contact support for assistance.";
    }
  };

  const getNextActionCTA = () => {
    switch (status) {
      case "approved":          return { label: "Complete Intake Sheet →", path: "/candidate-dashboard/intake" };
      case "roles_suggested":   return { label: "Review Suggested Roles →", path: "/candidate-dashboard/roles" };
      case "roles_confirmed":   return { label: "View Payments →", path: "/candidate-dashboard/payments" };
      case "paid":              return { label: "Complete Credential Intake →", path: "/candidate-dashboard/credentials" };
      case "active_marketing":  return { label: "View Applications →", path: "/candidate-dashboard/applications" };
      case "past_due":          return { label: "Update Billing →", path: "/candidate-dashboard/billing" };
      default: return null;
    }
  };

  const markNotifRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const cta = getNextActionCTA();

  return (
    <DashboardLayout title="Candidate Dashboard" navItems={navItems}>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-5">
          {/* Placed Banner */}
          {status === "placed" && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-secondary/30 bg-secondary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15">
                    <Award className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-card-foreground text-sm">Case Closed — You've Been Placed! 🎉</p>
                    <p className="text-xs text-muted-foreground">Your placement is complete. Thank you for trusting us.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Paused/Cancelled/On Hold Banner */}
          {["paused", "cancelled", "on_hold"].includes(status) && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4">
                <p className="font-semibold text-card-foreground capitalize text-sm">{status.replace("_", " ")} — {getNextAction()}</p>
              </CardContent>
            </Card>
          )}

          {/* Past Due Banner */}
          {status === "past_due" && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-semibold text-card-foreground text-sm">Payment Past Due</p>
                  <p className="text-xs text-muted-foreground">Please visit your <a href="/candidate-dashboard/billing" className="underline text-primary hover:text-primary/80">Billing page</a> to resolve this.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {notifications.length > 0 && (
            <Card className="border-secondary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Bell className="h-4 w-4 text-secondary" /> Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className="flex items-start justify-between rounded-xl border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-card-foreground text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => markNotifRead(n.id)}>✓</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Welcome back</CardTitle>
                <StatusBadge status={status} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{getNextAction()}</p>
              {cta && (
                <Button variant="hero" className="mt-4" onClick={() => window.location.href = cta.path}>
                  {cta.label}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Team Card */}
          {team.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-secondary" /> Your Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {team.map((member: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground text-sm">{member.full_name || "Team Member"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role_type?.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Training Buttons */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Schedule Training</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2.5 sm:grid-cols-2">
              <TrainingButton candidate={candidate} type="training_practice" label="Training Practice" />
              <TrainingButton candidate={candidate} type="mock_practice" label="Mock Practice Call" />
              <TrainingButton candidate={candidate} type="interview_training" label="Interview Training" />
              <TrainingButton candidate={candidate} type="interview_support" label="Interview Support" />
              <TrainingButton candidate={candidate} type="operations_call" label="Operations Call" />
            </CardContent>
          </Card>
        </div>

        <div>
          <CandidateTimeline currentStatus={status} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CandidateDashboard;
