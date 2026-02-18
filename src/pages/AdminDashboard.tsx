import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import AdminCandidateDetail from "@/pages/admin/AdminCandidateDetail";
import AdminReferralsPage from "@/pages/admin/AdminReferralsPage";
import AdminConfigPage from "@/pages/admin/AdminConfigPage";
import AdminReportsPage from "@/pages/admin/AdminReportsPage";
import AdminGlobalAuditTab from "@/components/admin/AdminGlobalAuditTab";
import AdminApprovalsPage from "@/pages/admin/AdminApprovalsPage";
import AdminBillingRunPage from "@/pages/admin/AdminBillingRunPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, ClipboardList, Shield, FileText, DollarSign, UserPlus, Activity, Eye, Bell, Settings, BarChart, CreditCard, AlertTriangle, CheckCircle, Briefcase, MousePointer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Operations", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Approvals", path: "/admin-dashboard/approvals", icon: <Shield className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Users className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Payments", path: "/admin-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
  { label: "Reports", path: "/admin-dashboard/reports", icon: <BarChart className="h-4 w-4" /> },
  { label: "Billing Run", path: "/admin-dashboard/billing-run", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Configuration", path: "/admin-dashboard/config", icon: <Settings className="h-4 w-4" /> },
];

const STATUSES = [
  "lead", "approved", "intake_submitted", "roles_suggested", "roles_confirmed",
  "paid", "credential_completed", "active_marketing", "paused", "cancelled", "placed"
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [billingAlerts, setBillingAlerts] = useState(0);
  const [trainingClicks7d, setTrainingClicks7d] = useState(0);
  const [trainingClicks30d, setTrainingClicks30d] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: cands } = await supabase.from("candidates").select("*");
    if (cands) {
      const userIds = cands.map((c: any) => c.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      const merged = cands.map((c: any) => ({ ...c, profile: profiles?.find((p: any) => p.user_id === c.user_id) }));
      setCandidates(merged);
      const counts: Record<string, number> = {};
      STATUSES.forEach((s) => { counts[s] = 0; });
      cands.forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
      setPipelineCounts(counts);
    }

    // Pending approvals count
    const { data: pending } = await supabase.rpc("admin_get_pending_approvals");
    setPendingApprovals(pending?.length || 0);

    // Billing alerts (past_due + grace_period subscriptions)
    const { data: billingSubs } = await supabase
      .from("candidate_subscriptions")
      .select("id")
      .in("status", ["past_due", "grace_period"]);
    setBillingAlerts(billingSubs?.length || 0);

    // Training clicks
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: clicks7 } = await supabase
      .from("training_clicks")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);
    const { count: clicks30 } = await supabase
      .from("training_clicks")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo);
    setTrainingClicks7d(clicks7 || 0);
    setTrainingClicks30d(clicks30 || 0);

    if (user) {
      const { data: notifs } = await supabase.from("notifications").select("*").eq("user_id", user.id).eq("is_read", false).order("created_at", { ascending: false }).limit(10);
      setNotifications(notifs || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    const { error } = await supabase.rpc("admin_update_candidate_status", { _candidate_id: candidateId, _new_status: newStatus, _reason: "" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Status updated" }); fetchData(); }
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const subPath = location.pathname.replace("/admin-dashboard", "").replace(/^\//, "");

  if (subPath.startsWith("candidates/")) {
    const candidateId = subPath.replace("candidates/", "");
    return <AdminCandidateDetail candidateId={candidateId} />;
  }
  if (subPath === "approvals") return <DashboardLayout title="Approvals" navItems={navItems}><AdminApprovalsPage /></DashboardLayout>;
  if (subPath === "referrals") return <DashboardLayout title="Referrals" navItems={navItems}><AdminReferralsPage /></DashboardLayout>;
  if (subPath === "config") return <DashboardLayout title="Configuration" navItems={navItems}><AdminConfigPage /></DashboardLayout>;
  if (subPath === "reports") return <DashboardLayout title="Reports & Exports" navItems={navItems}><AdminReportsPage /></DashboardLayout>;
  if (subPath === "audit") return <DashboardLayout title="Audit Logs" navItems={navItems}><AdminGlobalAuditTab /></DashboardLayout>;
  if (subPath === "billing-run") return <DashboardLayout title="Billing Run" navItems={navItems}><AdminBillingRunPage /></DashboardLayout>;

  const pipelineWidgets = [
    { key: "pending_approvals", label: "Pending Approvals", count: pendingApprovals, icon: <Shield className="h-4 w-4" />, link: "/admin-dashboard/approvals", color: "bg-destructive/10 text-destructive" },
    { key: "lead", label: "New Leads", count: pipelineCounts["lead"] || 0, icon: <Activity className="h-4 w-4" />, filter: "lead", color: "bg-muted" },
    { key: "approved", label: "Approved", count: pipelineCounts["approved"] || 0, icon: <CheckCircle className="h-4 w-4" />, filter: "approved", color: "bg-secondary/10" },
    { key: "intake_submitted", label: "Intake → Awaiting Roles", count: pipelineCounts["intake_submitted"] || 0, icon: <FileText className="h-4 w-4" />, filter: "intake_submitted", color: "bg-accent/10" },
    { key: "roles_confirmed", label: "Roles → Awaiting Payment", count: pipelineCounts["roles_confirmed"] || 0, icon: <ClipboardList className="h-4 w-4" />, filter: "roles_confirmed", color: "bg-accent/20" },
    { key: "paid", label: "Paid", count: pipelineCounts["paid"] || 0, icon: <DollarSign className="h-4 w-4" />, filter: "paid", color: "bg-secondary/20" },
    { key: "credential_completed", label: "Credentials Ready", count: pipelineCounts["credential_completed"] || 0, icon: <Briefcase className="h-4 w-4" />, filter: "credential_completed", color: "bg-secondary/30" },
    { key: "active_marketing", label: "Active Marketing", count: pipelineCounts["active_marketing"] || 0, icon: <Activity className="h-4 w-4" />, filter: "active_marketing", color: "bg-secondary/40" },
    { key: "placed", label: "Placed", count: pipelineCounts["placed"] || 0, icon: <Users className="h-4 w-4" />, filter: "placed", color: "bg-secondary text-secondary-foreground" },
    { key: "billing_alerts", label: "Billing Alerts", count: billingAlerts, icon: <AlertTriangle className="h-4 w-4" />, link: "/admin-dashboard/billing-run", color: billingAlerts > 0 ? "bg-destructive/10 text-destructive" : "bg-muted" },
    { key: "paused", label: "Paused", count: pipelineCounts["paused"] || 0, icon: <AlertTriangle className="h-4 w-4" />, filter: "paused", color: "bg-accent/30" },
    { key: "training_clicks", label: "Training Clicks (7d / 30d)", count: trainingClicks7d, icon: <MousePointer className="h-4 w-4" />, link: "/admin-dashboard/config", color: "bg-muted", subtitle: `${trainingClicks7d} / ${trainingClicks30d}` },
  ];

  const filteredCandidates = activeFilter
    ? candidates.filter(c => c.status === activeFilter)
    : candidates;

  return (
    <DashboardLayout title="Admin Operations" navItems={navItems}>
      {notifications.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications ({notifications.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className="flex items-start justify-between rounded-lg border border-border bg-accent/5 p-3">
                <div className="flex-1">
                  <p className="font-medium text-card-foreground text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  {n.link && <Button variant="outline" size="sm" onClick={() => navigate(n.link)}>View</Button>}
                  <Button variant="ghost" size="sm" onClick={() => markNotifRead(n.id)}>✓</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pipeline Widgets */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {pipelineWidgets.map((w) => (
          <Card
            key={w.key}
            className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === (w as any).filter ? "ring-2 ring-primary" : ""}`}
            onClick={() => {
              if ((w as any).link) {
                navigate((w as any).link);
              } else if ((w as any).filter) {
                setActiveFilter(prev => prev === (w as any).filter ? null : (w as any).filter);
              }
            }}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${w.color}`}>{w.icon}</div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-card-foreground leading-tight">
                  {(w as any).subtitle || w.count}
                </p>
                <p className="text-xs text-muted-foreground truncate">{w.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <StatusBadge status={activeFilter} />
          <Button variant="ghost" size="sm" onClick={() => setActiveFilter(null)}>Clear</Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{activeFilter ? `Candidates — ${activeFilter.replace(/_/g, " ")}` : "All Candidates"}</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Change Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.profile?.full_name || "—"}</TableCell>
                    <TableCell>{c.profile?.email || "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(val) => handleStatusChange(c.id, val)}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin-dashboard/candidates/${c.id}`)}>
                        <Eye className="mr-1 h-4 w-4" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminDashboard;
