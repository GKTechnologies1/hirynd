import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, notificationsApi, recruitersApi } from "@/services/api";
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
  pending_approval:      ["overview"],
  lead:                  ["overview"],
  approved:              ["overview", "intake"],
  intake_submitted:      ["overview", "intake"],
  roles_published:       ["overview", "intake", "roles"],
  roles_confirmed:       ["overview", "intake", "roles", "payments"],
  payment_completed:     ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  credentials_submitted: ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  active_marketing:      ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  paused:                ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  on_hold:               ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  past_due:              ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  cancelled:             ["overview"],
  placed_closed:         ["overview", "intake", "roles", "credentials", "payments", "billing", "applications", "interviews", "referrals", "messages", "settings"],
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
      <Card className="max-w-lg mx-auto mt-12 glass-card animate-in">
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
    const url = candidate?.[type === "training_practice" ? "cal_training_url" : 
                type === "mock_practice" ? "cal_mock_practice_url" : 
                type === "interview_training" ? "cal_interview_training_url" : 
                type === "interview_support" ? "cal_interview_support_url" : 
                "cal_operations_call_url"];
    window.open(url || "https://cal.com/hyrind", "_blank");
  };
  return (
    <Button variant="outline" className="justify-start" onClick={handleClick} disabled={!candidate}>
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
      const { data: cand } = await candidatesApi.me();
      setCandidate(cand);
      
      // Fetch team assignments
      try {
        const { data: assignments } = await recruitersApi.assignments(cand.id);
        const teamData = assignments
          .filter((a: any) => a.is_active)
          .map((a: any) => ({
            id: a.id, // Added id for key
            recruiter_name: a.recruiter_name || "Team Member",
            role: a.role_type || "Recruiter" // Changed role_type to role
          }));
        setTeam(teamData);
      } catch { /* ignore team error */ }

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

  if (!candidate && user?.role !== 'admin') {
    return <DashboardLayout title="No Profile" navItems={navItems}><p className="py-20 text-center text-muted-foreground">Your candidate profile is being created...</p></DashboardLayout>;
  }

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
      case "roles_published":   return "Review and respond to your suggested roles.";
      case "roles_confirmed":   return "Your roles are confirmed. Waiting for payment step.";
      case "payment_completed": return "Payment received. Submit your credential intake sheet.";
      case "credentials_submitted": return "Your credentials are submitted. Waiting for recruiter assignment.";
      case "active_marketing":  return "Your profile is being actively marketed!";
      case "placed_closed":     return "🎉 Congratulations! You've been placed.";
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
      case "roles_published":   return { label: "Review Suggested Roles →", path: "/candidate-dashboard/roles" };
      case "roles_confirmed":   return { label: "View Payments →", path: "/candidate-dashboard/payments" };
      case "payment_completed": return { label: "Complete Credential Intake →", path: "/candidate-dashboard/credentials" };
      case "active_marketing":  return { label: "View Applications →", path: "/candidate-dashboard/applications" };
      case "credentials_submitted": 
      case "credential_completed":
        return { label: "Review Credentials →", path: "/candidate-dashboard/credentials" };
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
    <DashboardLayout title="Dashboard" navItems={navItems}>
      <div className="space-y-8 animate-in">
        {/* Hero Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4 border-b border-border/40 pb-6 mb-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-card-foreground">Welcome back, {user?.profile?.full_name?.split(" ")[0] || "Candidate"}!</h1>
            <p className="text-muted-foreground mt-2 text-lg">Here is the latest update on your marketing journey.</p>
          </div>
          <div className="flex items-center gap-3">
             <StatusBadge status={status} />
          </div>
        </header>

        {/* Timeline Visualization */}
        <div className="glass-card rounded-3xl p-8 shadow-sm border border-border/30 bg-card/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Journey Progress</h2>
            <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
               <div className="h-full bg-secondary transition-all" style={{ width: '45%' }} />
            </div>
          </div>
          <CandidateTimeline currentStatus={status} />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Status-specific Banners */}
            {status === "placed_closed" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-secondary/40 bg-secondary/5 border-l-8 border-l-secondary shadow-lg">
                  <CardContent className="p-8 flex items-center gap-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary/15">
                      <Award className="h-8 w-8 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-card-foreground">Congratulations! You've been placed! 🎉</h3>
                      <p className="text-muted-foreground mt-1">Your marketing journey has successfully concluded. We are proud to have been part of your career growth.</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {["paused", "cancelled", "on_hold", "past_due"].includes(status) && (
              <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <p className="font-semibold text-card-foreground italic leading-relaxed">
                    Status: <span className="capitalize">{status.replace("_", " ")}</span> — {getNextAction()}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Action Card */}
            <Card className="glass-card shadow-2xl border-none overflow-hidden group hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500">
               <div className="absolute top-0 right-0 p-12 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                <Briefcase className="h-48 w-48 text-secondary" />
              </div>
              <CardHeader className="pb-4 px-10 pt-10">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                  What's Next?
                </CardTitle>
              </CardHeader>
              <CardContent className="px-10 pb-10 relative z-10">
                <p className="text-xl text-card-foreground/90 leading-relaxed font-medium mb-8">
                  {getNextAction()}
                </p>
                {cta && (
                  <Button variant="hero" className="w-full sm:w-auto h-14 px-12 rounded-2xl shadow-hero text-lg font-bold hover:scale-[1.02] transition-transform active:scale-95" onClick={() => window.location.href = cta.path}>
                    {cta.label}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Notifications Feed */}
            {notifications.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground px-1">Recent Activity</h3>
                <Card className="border-border/40 shadow-sm overflow-hidden bg-card/30">
                  <div className="divide-y divide-border/20">
                    {notifications.map((n: any) => (
                      <div key={n.id} className="flex items-start justify-between p-6 hover:bg-muted/10 transition-colors group">
                        <div className="flex gap-4">
                          <div className="mt-1 h-2 w-2 rounded-full bg-secondary shrink-0" />
                          <div className="space-y-1">
                            <p className="font-bold text-card-foreground text-base group-hover:text-primary transition-colors">{n.title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-muted-foreground hover:text-secondary opacity-0 group-hover:opacity-100 transition-all font-bold rounded-xl" onClick={() => markNotifRead(n.id)}>✓</Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Support Team */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground px-1 flex items-center gap-2">
                <Users className="h-4 w-4" /> Your Support Team
              </h3>
              <Card className="glass-card border-none shadow-md overflow-hidden">
                <div className="divide-y divide-border/20">
                  {team.length > 0 ? (
                    team.map((member: any) => (
                      <div key={member.id} className="flex items-center gap-5 p-5 hover:bg-secondary/5 transition-colors">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary font-bold text-base shadow-inner">
                          {member.recruiter_name?.[0]}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-base font-bold truncate">{member.recruiter_name}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-0.5 opacity-70">
                            {member.role?.replace("_", " ") || "Member"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center space-y-4">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/20">
                        <Users className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                      <p className="text-xs text-muted-foreground italic max-w-[200px] mx-auto leading-relaxed">A dedicated support team will be assigned once your marketing profile is finalized.</p>
                    </div>
                  )}
                </div>
              </Card>
            </section>

            {/* Quick Access */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground px-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Training & Calls
              </h3>
              <Card className="border-border/40 bg-card/30 p-2">
                <div className="grid gap-2">
                  <TrainingButton candidate={candidate} type="training_practice" label="Training Practice" />
                  <TrainingButton candidate={candidate} type="mock_practice" label="Mock Practice Call" />
                  <TrainingButton candidate={candidate} type="interview_training" label="Interview Training" />
                  <TrainingButton candidate={candidate} type="interview_support" label="Interview Support" />
                  <TrainingButton candidate={candidate} type="operations_call" label="Operations Call" />
                </div>
              </Card>
            </section>

             {/* Help Card */}
            <Card className="border-border/40 bg-gradient-to-br from-card to-muted/20 shadow-sm overflow-hidden">
              <CardContent className="p-6 text-center space-y-4">
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">Questions about your journey?</p>
                <Button variant="outline" className="w-full rounded-xl border-secondary/30 text-secondary hover:bg-secondary hover:text-white transition-all font-bold" onClick={() => window.location.href='/contact'}>
                  Message Support Center
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CandidateDashboard;
