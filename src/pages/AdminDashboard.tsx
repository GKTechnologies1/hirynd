import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import AdminCandidateDetail from "@/pages/admin/AdminCandidateDetail";
import AdminReferralsPage from "@/pages/admin/AdminReferralsPage";
import AdminConfigPage from "@/pages/admin/AdminConfigPage";
import AdminReportsPage from "@/pages/admin/AdminReportsPage";
import AdminApprovalsPage from "@/pages/admin/AdminApprovalsPage";
import AdminBillingRunPage from "@/pages/admin/AdminBillingRunPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminPaymentsPage from "@/pages/admin/AdminPaymentsPage";
import AdminActivityPage from "@/pages/admin/AdminActivityPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Users, ClipboardList, Shield, FileText, DollarSign,
  UserPlus, Activity, Eye, Bell, Settings, BarChart, CreditCard,
  AlertTriangle, CheckCircle, Briefcase, MousePointer, TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Approvals", path: "/admin-dashboard/approvals", icon: <Shield className="h-4 w-4" /> },
  { label: "Users", path: "/admin-dashboard/users", icon: <Users className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Payments", path: "/admin-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Activity", path: "/admin-dashboard/activity", icon: <Activity className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
  { label: "Reports", path: "/admin-dashboard/reports", icon: <BarChart className="h-4 w-4" /> },
  { label: "Billing Run", path: "/admin-dashboard/billing-run", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Configuration", path: "/admin-dashboard/config", icon: <Settings className="h-4 w-4" /> },
];

const STATUSES = [
  "pending_approval", "approved", "intake_submitted", "roles_suggested", "roles_confirmed",
  "paid", "credential_completed", "active_marketing", "paused", "cancelled", "placed"
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data } = await authApi.dashboardStats();
      setStats(data);

      // Also fetch candidates for the table
      const { data: cands } = await (await import("@/services/api")).candidatesApi.list();
      setCandidates(cands || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      const { candidatesApi } = await import("@/services/api");
      await candidatesApi.updateStatus(candidateId, newStatus);
      toast({ title: "Status updated" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
  };

  const subPath = location.pathname.replace("/admin-dashboard", "").replace(/^\//, "");

  // Sub-routing
  if (subPath.startsWith("candidates/")) {
    const candidateId = subPath.replace("candidates/", "");
    return <AdminCandidateDetail candidateId={candidateId} />;
  }
  if (subPath === "approvals") return <DashboardLayout title="Approvals" navItems={navItems}><AdminApprovalsPage /></DashboardLayout>;
  if (subPath === "users") return <DashboardLayout title="User Management" navItems={navItems}><AdminUsersPage /></DashboardLayout>;
  if (subPath === "payments") return <DashboardLayout title="Payments & Billing" navItems={navItems}><AdminPaymentsPage /></DashboardLayout>;
  if (subPath === "activity") return <DashboardLayout title="Activity Tracking" navItems={navItems}><AdminActivityPage /></DashboardLayout>;
  if (subPath === "referrals") return <DashboardLayout title="Referrals" navItems={navItems}><AdminReferralsPage /></DashboardLayout>;
  if (subPath === "config") return <DashboardLayout title="Configuration" navItems={navItems}><AdminConfigPage /></DashboardLayout>;
  if (subPath === "reports") return <DashboardLayout title="Reports & Exports" navItems={navItems}><AdminReportsPage /></DashboardLayout>;
  if (subPath === "audit") return <DashboardLayout title="Audit Logs" navItems={navItems}><AdminActivityPage /></DashboardLayout>;
  if (subPath === "billing-run") return <DashboardLayout title="Billing Run" navItems={navItems}><AdminBillingRunPage /></DashboardLayout>;

  const pipeline = stats?.pipeline || {};

  const metricWidgets = [
    { label: "Total Users", value: stats?.total_users || 0, icon: <Users className="h-5 w-5" />, color: "bg-primary/10 text-primary" },
    { label: "Candidates", value: stats?.total_candidates || 0, icon: <Briefcase className="h-5 w-5" />, color: "bg-secondary/10 text-secondary" },
    { label: "Recruiters", value: stats?.total_recruiters || 0, icon: <UserPlus className="h-5 w-5" />, color: "bg-accent/10 text-accent-foreground" },
    { label: "Active Marketing", value: stats?.active_candidates || 0, icon: <Activity className="h-5 w-5" />, color: "bg-secondary/20 text-secondary" },
    { label: "Job Postings", value: stats?.total_job_postings || 0, icon: <ClipboardList className="h-5 w-5" />, color: "bg-muted" },
    { label: "Applications", value: stats?.total_applications || 0, icon: <FileText className="h-5 w-5" />, color: "bg-muted" },
    { label: "Revenue", value: `₹${(stats?.total_revenue || 0).toLocaleString()}`, icon: <DollarSign className="h-5 w-5" />, color: "bg-secondary/10 text-secondary" },
    { label: "New This Week", value: stats?.recent_registrations || 0, icon: <TrendingUp className="h-5 w-5" />, color: "bg-accent/10 text-accent-foreground" },
  ];

  const pipelineWidgets = [
    { key: "pending", label: "Pending Approvals", count: stats?.pending_approvals || 0, icon: <Shield className="h-4 w-4" />, link: "/admin-dashboard/approvals", color: "bg-destructive/10 text-destructive" },
    ...STATUSES.map(s => ({
      key: s,
      label: s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      count: pipeline[s] || 0,
      icon: <Activity className="h-4 w-4" />,
      filter: s,
      color: s === "placed" ? "bg-secondary text-secondary-foreground" : s === "active_marketing" ? "bg-secondary/30" : "bg-muted",
    })),
    { key: "billing_alerts", label: "Billing Alerts", count: stats?.billing_alerts || 0, icon: <AlertTriangle className="h-4 w-4" />, link: "/admin-dashboard/billing-run", color: (stats?.billing_alerts || 0) > 0 ? "bg-destructive/10 text-destructive" : "bg-muted" },
  ];

  const filteredCandidates = activeFilter
    ? candidates.filter((c: any) => c.status === activeFilter)
    : candidates;

  return (
    <DashboardLayout title="Admin Dashboard" navItems={navItems}>
      {/* Key Metrics */}
      <div className="dashboard-section">
        <p className="dashboard-section-title">Key Metrics</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricWidgets.map((w, i) => (
            <motion.div key={w.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="hover:shadow-md transition-all duration-200">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${w.color}`}>{w.icon}</div>
                  <div>
                    <p className="text-xl font-bold text-card-foreground">{w.value}</p>
                    <p className="text-xs text-muted-foreground">{w.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <div className="dashboard-section">
        <p className="dashboard-section-title">Pipeline Overview</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {pipelineWidgets.map((w, i) => (
            <motion.div key={w.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
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
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${w.color}`}>{w.icon}</div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-card-foreground leading-none">{w.count}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{w.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {stats?.recent_activity?.length > 0 && (
        <div className="dashboard-section">
          <p className="dashboard-section-title">Recent Activity</p>
          <Card>
            <CardContent className="p-4 space-y-2">
              {stats.recent_activity.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{a.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{a.actor_name} • {a.target_type}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter indicator */}
      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtered by:</span>
          <StatusBadge status={activeFilter} />
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveFilter(null)}>Clear</Button>
        </div>
      )}

      {/* Candidates Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {activeFilter ? `Candidates — ${activeFilter.replace(/_/g, " ")}` : "All Candidates"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
            <div className="rounded-xl border border-border overflow-auto">
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
                      <TableCell className="font-medium text-sm">{c.full_name || c.profile?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.email || c.profile?.email || "—"}</TableCell>
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
