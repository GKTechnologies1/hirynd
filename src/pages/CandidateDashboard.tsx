import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { formatDate } from "@/lib/utils";
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
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Billing", path: "/candidate-dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Phone className="h-4 w-4" /> },
  { label: "Referral", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Messages", path: "/candidate-dashboard/messages", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Settings", path: "/candidate-dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

const STATUS_TAB_ACCESS: Record<string, string[]> = {
  pending_approval:      ["overview"],
  lead:                  ["overview"],
  approved:              ["overview", "intake"],
  intake_submitted:      ["overview", "intake"],
  roles_published:       ["overview", "intake", "roles"],
  roles_candidate_responded: ["overview", "intake", "roles", "payments"],
  roles_confirmed:       ["overview", "intake", "roles", "payments"],
  payment_pending:       ["overview", "intake", "roles", "payments"],
  pending_payment:       ["overview", "intake", "roles", "payments"],
  payment_completed:     ["overview", "intake", "roles", "payments", "credentials", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  credentials_submitted: ["overview", "intake", "roles", "payments", "credentials", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  active_marketing:      ["overview", "intake", "roles", "payments", "credentials", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  paused:                ["overview", "intake", "roles", "payments", "credentials", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  on_hold:               ["overview", "intake", "roles", "payments", "credentials", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  past_due:              ["overview", "intake", "roles", "payments", "credentials", "billing", "applications", "interviews", "referrals", "messages", "settings"],
  cancelled:             ["overview"],
  placed_closed:         ["overview", "intake", "roles", "payments", "credentials", "billing", "applications", "interviews", "referrals", "messages", "settings"],
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
  const navigate = useNavigate();
  const info = LOCKED_MESSAGES[tab] || { title: "Locked", reason: "This section is not available yet." };
  return (
    <Card className="max-w-lg mx-auto mt-12 glass-card animate-in border-none shadow-2xl">
      <CardContent className="py-16 text-center">
        <div className="mx-auto h-20 w-20 bg-muted/20 rounded-3xl flex items-center justify-center mb-6">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-bold text-card-foreground">{info.title}</h3>
        <p className="text-muted-foreground mt-3 text-base max-w-[280px] mx-auto leading-relaxed">{info.reason}</p>
        {info.action && info.actionPath && (
          <Button variant="hero" className="mt-8 scale-110" onClick={() => navigate(info.actionPath!)}>
            {info.action}
          </Button>
        )}
      </CardContent>
    </Card>
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
    <Button variant="outline" className="justify-start h-12 rounded-xl group hover:border-secondary/50 transition-all font-semibold" onClick={handleClick} disabled={!candidate}>
      <Calendar className="mr-3 h-4 w-4 text-secondary group-hover:scale-110 transition-transform" /> {label}
    </Button>
  );
};

const CandidateDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingInterviews, setFetchingInterviews] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: cand } = await candidatesApi.me();
      setCandidate(cand);
      
      try {
        const { data: assignments } = await recruitersApi.assignments(cand.id);
        const teamData = assignments
          .filter((a: any) => a.is_active)
          .map((a: any) => ({
            id: a.id,
            recruiter_name: a.recruiter_name || "Team Member",
            role: a.role_type || "Recruiter"
          }));
        setTeam(teamData);
      } catch { /* ignore team error */ }

      try {
        const { data: notifs } = await notificationsApi.list(true);
        setNotifications(notifs?.slice(0, 10) || []);
      } catch { /* ignore */ }

      try {
        setFetchingInterviews(true);
        const { data: interviewData } = await candidatesApi.getInterviews(cand.id);
        setInterviews(interviewData || []);
      } catch { /* ignore */ } finally {
        setFetchingInterviews(false);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh when returns to tab
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, navigate, location.pathname]);

  const subPath = useMemo(() => {
    return location.pathname.replace("/candidate-dashboard", "").replace(/^\//, "") || "overview";
  }, [location.pathname]);

  const status = candidate?.status || "pending_approval";

  // Auto-redirect to critical sections based on status
  useEffect(() => {
    if (loading || !candidate) return;

    if (subPath === "overview") {
      if (status === "roles_published") {
        navigate("/candidate-dashboard/roles");
      }
    }
  }, [status, subPath, loading, candidate, navigate]);
  const allowedTabs = STATUS_TAB_ACCESS[status] || ["overview"];
  const tabKey = subPath === "" ? "overview" : subPath;
  const isBillingTab = tabKey === "payments" || tabKey === "billing";
  const hasPendingSub = ["payment_pending", "pending_payment", "pending", "unpaid", "past_due"].includes(candidate?.subscription_status);

  // Unlock interviews if any exist, even if status is not active_marketing yet
  const canSeeInterviews = allowedTabs.includes("interviews") || interviews.length > 0;
  
  const isLocked = tabKey !== "overview" && 
    (tabKey === "interviews" ? !canSeeInterviews : !allowedTabs.includes(tabKey)) && 
    !(isBillingTab && hasPendingSub);

  const getNextAction = () => {
    switch (status) {
      case "pending_approval": return "Your registration is under review. We'll notify you within 24–48 hours.";
      case "lead":              return "Your account has been noted. Awaiting full approval.";
      case "approved":          return "Complete your Client Intake Sheet to proceed.";
      case "intake_submitted":  return "Your intake is under review. Waiting for role suggestions from your team.";
      case "roles_published":   return "Review and respond to your suggested roles.";
      case "roles_candidate_responded":
      case "roles_confirmed":   
      case "payment_pending":
      case "pending_payment":   return "Your roles are confirmed. Please proceed to payment to unlock the next steps.";
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
    if (["payment_pending", "pending_payment", "pending", "unpaid", "past_due"].includes(candidate?.subscription_status)) {
      return { label: "Pay Now →", path: "/candidate-dashboard/payments" };
    }
    switch (status) {
      case "approved":          return { label: "Complete Intake Sheet →", path: "/candidate-dashboard/intake" };
      case "roles_published":   return { label: "Review Suggested Roles →", path: "/candidate-dashboard/roles" };
      case "roles_candidate_responded":
      case "roles_confirmed":   
      case "payment_pending":
      case "pending_payment":   return { label: "View Payments →", path: "/candidate-dashboard/payments" };
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

  const renderContent = () => {
    if (loading) return <div className="py-20 text-center"><p className="text-muted-foreground animate-pulse font-medium">Loading your profile...</p></div>;
    if (!candidate && user?.role !== 'admin') return <p className="py-20 text-center text-muted-foreground">Your candidate profile is being created...</p>;
    if (isLocked) return <LockedTab tab={tabKey} />;

    switch (subPath) {
      case "intake": return <CandidateIntakePage candidate={candidate} onStatusChange={fetchData} />;
      case "roles": return <CandidateRolesPage candidate={candidate} onStatusChange={fetchData} />;
      case "credentials": return <CandidateCredentialsPage candidate={candidate} onStatusChange={fetchData} />;
      case "payments": return <CandidatePaymentsPage candidate={candidate} onStatusChange={fetchData} />;
      case "billing": return <CandidateBillingPage candidate={candidate} />;
      case "applications": return <CandidateApplicationsPage candidate={candidate} />;
      case "interviews": return <CandidateInterviewsPage candidate={candidate} />;
      case "referrals": return <CandidateReferralsPage candidate={candidate} />;
      case "settings": return <CandidateSettingsPage />;
      case "messages": return <CandidateMessagesPage />;
      default: return (
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

          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Left Column (Main Journey) */}
            <div className="lg:col-span-7 space-y-8">
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

              {/* Upcoming Interviews Section */}
              {interviews.filter(i => ["scheduled", "Follow-up Needed", "Rescheduled"].includes(i.outcome)).length > 0 && (
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-secondary px-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Upcoming Interviews
                  </h3>
                  <div className="grid gap-4">
                    {interviews
                      .filter(i => ["scheduled", "Follow-up Needed", "Rescheduled"].includes(i.outcome))
                      .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime())
                      .map((iv) => (
                        <Card key={iv.id} className="glass-card border-none shadow-lg overflow-hidden group hover:shadow-secondary/10 transition-all border-l-4 border-l-secondary">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                                    {iv.interview_type?.replace(/_/g, " ")}
                                  </span>
                                  {iv.stage_round && (
                                    <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                                      {iv.stage_round}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-lg font-bold text-card-foreground group-hover:text-secondary transition-colors">
                                  {iv.company_name} — {iv.role_title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" /> {formatDate(iv.interview_date)}
                                  </div>
                                  {iv.interview_time && (
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="h-3.5 w-3.5 text-secondary" /> {iv.interview_time} ({iv.time_zone || "EST"})
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button variant="secondary" size="sm" className="rounded-xl font-bold h-10 px-6" onClick={() => navigate("/candidate-dashboard/interviews")}>
                                Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </section>
              )}

              {status === "placed_closed" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-secondary/40 bg-secondary/5 border-l-8 border-l-secondary shadow-lg">
                    <CardContent className="p-8 flex items-center gap-6">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary/15">
                        <Award className="h-8 w-8 text-secondary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-card-foreground">Congratulations! You've been placed! 🎉</h3>
                        <p className="text-muted-foreground mt-1">Your marketing journey has successfully concluded.</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <Card className="glass-card shadow-2xl border-none overflow-hidden group hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500">
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
                    <Button variant="hero" className="w-full sm:w-auto h-14 px-12 rounded-2xl shadow-hero text-lg font-bold hover:scale-[1.02] transition-transform active:scale-95" onClick={() => navigate(cta.path)}>
                      {cta.label}
                    </Button>
                  )}
                </CardContent>
              </Card>

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

            {/* Right Column (Sidebar Support) */}
            <div className="lg:col-span-5 space-y-8">
              {["paused", "cancelled", "on_hold", "past_due"].includes(status) && (
                <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
                  <CardContent className="p-6 flex items-center gap-4">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <p className="font-semibold text-card-foreground italic leading-relaxed">
                      Status: <span className="capitalize">{status.replace("_", " ")}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

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
                        <p className="text-xs text-muted-foreground italic max-w-[200px] mx-auto leading-relaxed text-center">A dedicated support team will be assigned once your marketing profile is finalized.</p>
                      </div>
                    )}
                  </div>
                </Card>
              </section>

              {status === "active_marketing" && (
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
              )}

              <Card className="border-border/40 bg-gradient-to-br from-card to-muted/20 shadow-sm overflow-hidden border-none shadow-lg">
                <CardContent className="p-8 text-center space-y-5">
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed">Questions about your journey?</p>
                  <Button variant="hero" className="w-full h-11 px-0 shadow-lg shadow-primary/20" onClick={() => navigate('/contact?type=general')}>
                    Message Support / Help Desk
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <DashboardLayout 
      title={subPath === "overview" ? "Dashboard" : subPath.charAt(0).toUpperCase() + subPath.slice(1)} 
      navItems={navItems}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default CandidateDashboard;
