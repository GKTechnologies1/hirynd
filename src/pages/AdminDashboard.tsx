import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, authApi, billingApi, notificationsApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import AdminCandidateDetail from "@/pages/admin/AdminCandidateDetail";
import AdminReferralsPage from "@/pages/admin/AdminReferralsPage";
import AdminConfigPage from "@/pages/admin/AdminConfigPage";
import AdminReportsPage from "@/pages/admin/AdminReportsPage";
import AdminGlobalAuditTab from "@/components/admin/AdminGlobalAuditTab";
import AdminApprovalsPage from "@/pages/admin/AdminApprovalsPage";
import AdminBillingRunPage from "@/pages/admin/AdminBillingRunPage";
import AdminSubscriptionPlansPage from "@/pages/admin/AdminSubscriptionPlansPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, ClipboardList, Shield, FileText, DollarSign, UserPlus, Activity, Eye, Bell, Settings, BarChart, CreditCard, AlertTriangle, CheckCircle, Briefcase, MousePointer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const navItems = [
  { label: "Operations", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Approvals", path: "/admin-dashboard/approvals", icon: <Shield className="h-4 w-4" /> },
  { label: "All Users", path: "/admin-dashboard/users", icon: <Users className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Users className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Subscriptions", path: "/admin-dashboard/subscriptions", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
  { label: "Reports", path: "/admin-dashboard/reports", icon: <BarChart className="h-4 w-4" /> },
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
    setLoading(true);
    try {
      const { data: cands } = await candidatesApi.list();
      if (cands) {
        setCandidates(cands);
        const counts: Record<string, number> = {};
        STATUSES.forEach((s) => { counts[s] = 0; });
        cands.forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
        setPipelineCounts(counts);
      }
    } catch {}

    try {
      const { data: pending } = await authApi.pendingApprovals();
      setPendingApprovals(Array.isArray(pending) ? pending.length : 0);
    } catch {}

    try {
      const { data: alerts } = await billingApi.billingAlerts();
      setBillingAlerts(alerts?.count || 0);
    } catch {}

    if (user) {
      try {
        const { data: notifs } = await notificationsApi.list(true);
        setNotifications(Array.isArray(notifs) ? notifs.slice(0, 10) : []);
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      await candidatesApi.updateStatus(candidateId, newStatus);
      toast({ title: "Status updated" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const markNotifRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {});
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
  if (subPath === "subscriptions") return <DashboardLayout title="Subscription Plans" navItems={navItems}><AdminSubscriptionPlansPage /></DashboardLayout>;
  if (subPath === "users") return <DashboardLayout title="All Users" navItems={navItems}><AdminUsersPage /></DashboardLayout>;

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
        <Card className="mb-6 border-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-secondary" /> Notifications ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className="flex items-start justify-between rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  {n.link && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(n.link)}>View</Button>}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => markNotifRead(n.id)}>✓</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pipeline Widgets */}
      <div className="dashboard-section">
        <p className="dashboard-section-title">Pipeline Overview</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {pipelineWidgets.map((w, i) => (
            <motion.div
              key={w.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  activeFilter === (w as any).filter ? "ring-2 ring-secondary shadow-md" : ""
                }`}
                onClick={() => {
                  if ((w as any).link) navigate((w as any).link);
                  else if ((w as any).filter) setActiveFilter(prev => prev === (w as any).filter ? null : (w as any).filter);
                }}
              >
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${w.color} transition-transform group-hover:scale-105`}>
                    {w.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-card-foreground leading-none">
                      {(w as any).subtitle || w.count}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{w.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtered by:</span>
          <StatusBadge status={activeFilter} />
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveFilter(null)}>Clear</Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{activeFilter ? `Candidates — ${activeFilter.replace(/_/g, " ")}` : "All Candidates"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">Name</TableHead>
                    <TableHead className="text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Change Status</TableHead>
                    <TableHead className="text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((c: any) => (
                    <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-sm">{c.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell>
                        <Select value={c.status} onValueChange={(val) => handleStatusChange(c.id, val)}>
                          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/admin-dashboard/candidates/${c.id}`)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminDashboard;
