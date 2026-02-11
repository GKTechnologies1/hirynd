import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CandidateTimeline from "@/components/dashboard/CandidateTimeline";
import StatusBadge from "@/components/dashboard/StatusBadge";
import CandidateIntakePage from "@/pages/candidate/CandidateIntakePage";
import CandidateRolesPage from "@/pages/candidate/CandidateRolesPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Briefcase, Users, Calendar, UserPlus, ClipboardList, Bell } from "lucide-react";

const navItems = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Calendar className="h-4 w-4" /> },
  { label: "Refer a Friend", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
];

const CandidateDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [candidate, setCandidate] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const { data: cand } = await supabase
      .from("candidates")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cand) {
      const { data: newCand } = await supabase
        .from("candidates")
        .insert({ user_id: user.id })
        .select()
        .single();
      setCandidate(newCand);
    } else {
      setCandidate(cand);

      const { data: assignments } = await supabase
        .from("candidate_assignments")
        .select("role_type, recruiter_id")
        .eq("candidate_id", cand.id)
        .eq("is_active", true);

      if (assignments && assignments.length > 0) {
        const recruiterIds = assignments.map((a: any) => a.recruiter_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", recruiterIds);
        setTeam(assignments.map((a: any) => ({
          ...a,
          profile: profiles?.find((p: any) => p.user_id === a.recruiter_id),
        })));
      }
    }

    // Fetch notifications
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);
    setNotifications(notifs || []);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  if (loading) return <DashboardLayout title="Dashboard" navItems={navItems}><p>Loading...</p></DashboardLayout>;

  // Sub-routing
  const subPath = location.pathname.replace("/candidate-dashboard", "").replace(/^\//, "");

  if (subPath === "intake") {
    return <CandidateIntakePage candidate={candidate} onStatusChange={fetchData} />;
  }

  if (subPath === "roles") {
    return <CandidateRolesPage candidate={candidate} onStatusChange={fetchData} />;
  }

  const status = candidate?.status || "lead";

  const getNextAction = () => {
    switch (status) {
      case "lead": return "Your application is under review. We'll be in touch soon.";
      case "approved": return "Complete your Client Intake Form to proceed.";
      case "intake_submitted": return "Waiting for role suggestions from your team.";
      case "roles_suggested": return "Review and confirm your suggested roles.";
      case "roles_confirmed": return "Complete your payment to begin marketing.";
      case "paid": return "Submit your credential intake sheet.";
      case "credential_completed": return "Your profile is being assigned to a recruiter.";
      case "active_marketing": return "Your profile is being actively marketed!";
      case "placed": return "Congratulations! You've been placed.";
      default: return "Contact support for assistance.";
    }
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <DashboardLayout title="Candidate Dashboard" navItems={navItems}>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Notifications */}
          {notifications.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className="flex items-start justify-between rounded-lg border border-border bg-secondary/5 p-3">
                    <div>
                      <p className="font-medium text-card-foreground text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => markNotifRead(n.id)}>✓</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Welcome back</CardTitle>
                <StatusBadge status={status} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{getNextAction()}</p>
              {status === "approved" && (
                <Button variant="hero" className="mt-4" onClick={() => window.location.href = "/candidate-dashboard/intake"}>
                  Complete Intake Form
                </Button>
              )}
              {status === "roles_suggested" && (
                <Button variant="hero" className="mt-4" onClick={() => window.location.href = "/candidate-dashboard/roles"}>
                  Review Roles
                </Button>
              )}
              {status === "active_marketing" && (
                <Button variant="hero" className="mt-4" onClick={() => window.location.href = "/candidate-dashboard/applications"}>
                  View Applications
                </Button>
              )}
            </CardContent>
          </Card>

          {team.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Your Team</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.map((member: any) => (
                    <div key={member.recruiter_id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="font-medium text-card-foreground">{member.profile?.full_name || "Recruiter"}</p>
                        <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{member.role_type?.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start" onClick={() => window.open("https://cal.com/hyrind", "_blank")}>
                <Calendar className="mr-2 h-4 w-4" /> Schedule Training
              </Button>
              {candidate?.drive_folder_url && (
                <Button variant="outline" className="justify-start" onClick={() => window.open(candidate.drive_folder_url, "_blank")}>
                  <FileText className="mr-2 h-4 w-4" /> Resume Folder
                </Button>
              )}
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
