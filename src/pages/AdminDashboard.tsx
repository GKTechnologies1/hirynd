import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, authApi, billingApi, notificationsApi, jobsApi } from "@/services/api";
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
import AdminJobsPage from "@/pages/admin/AdminJobsPage";
import AdminCandidatesPage from "@/pages/admin/AdminCandidatesPage";
import AdminRecruitersPage from "@/pages/admin/AdminRecruitersPage";
import AdminRecruiterDetail from "@/pages/admin/AdminRecruiterDetail";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminInterestedCandidatesPage from "@/pages/admin/AdminInterestedCandidatesPage";
import AdminInterestedCandidateDetail from "@/pages/admin/AdminInterestedCandidateDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, ClipboardList, Shield, FileText, DollarSign, UserPlus, Activity, Eye, Bell, Settings, BarChart, CreditCard, AlertTriangle, CheckCircle, Briefcase, MousePointer, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";

import {
  BarChart as ReBarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import AdminPaymentsPage from "@/pages/admin/AdminPaymentsPage";
import AdminNotificationsPage from "@/pages/admin/AdminNotificationsPage";

const navItems = [
  { label: "Operations", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Approvals", path: "/admin-dashboard/approvals", icon: <Shield className="h-4 w-4" /> },
  { label: "All Users", path: "/admin-dashboard/users", icon: <Users className="h-4 w-4" /> },
  { label: "Interested Candidates", path: "/admin-dashboard/interested-candidates", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Users className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Jobs", path: "/admin-dashboard/jobs", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Payments", path: "/admin-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Subscriptions", path: "/admin-dashboard/subscriptions", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Billing Run", path: "/admin-dashboard/billing-run", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Notifications", path: "/admin-dashboard/notifications", icon: <Bell className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
  { label: "Reports", path: "/admin-dashboard/reports", icon: <BarChart className="h-4 w-4" /> },
  { label: "Configuration", path: "/admin-dashboard/config", icon: <Settings className="h-4 w-4" /> },
  { label: "Settings", path: "/admin-dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

const STATUSES = [
  "pending_approval", "lead", "approved", "intake_submitted", "roles_published",
  "roles_candidate_responded", "roles_confirmed", "payment_pending", "payment_completed",
  "credentials_submitted", "active_marketing", "paused", "on_hold", "past_due", "cancelled", "placed_closed"
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [billingAlerts, setBillingAlerts] = useState(0);
  const [trainingClicks7d, setTrainingClicks7d] = useState(0);
  const [trainingClicks30d, setTrainingClicks30d] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: cands }, { data: leads }] = await Promise.all([
        candidatesApi.list(),
        candidatesApi.interestedList()
      ]);

      if (cands) {
        setCandidates(cands);
        const counts: Record<string, number> = {};
        STATUSES.forEach((s) => { counts[s] = 0; });
        cands.forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
        
        // ADD: Merge InterestedCandidate count into "lead" pipeline count
        if (leads && Array.isArray(leads)) {
          counts["lead"] = (counts["lead"] || 0) + leads.length;
        }
        
        setPipelineCounts(counts);
      }
    } catch {}

    try {
      const { data: pending } = await authApi.pendingApprovals();
      setPendingApprovals(Array.isArray(pending) ? pending.length : 0);
    } catch {}

    try {
      const { data: recData } = await authApi.allUsers();
      const allUsers = Array.isArray(recData) ? recData : (recData?.results || []);
      const recList = allUsers.filter((u: any) => ["recruiter", "team_lead", "team_manager"].includes(u.role));
      setRecruiters(recList);
    } catch {}

    try {
      const { data: alerts } = await billingApi.billingAlerts();
      setBillingAlerts(alerts?.count || 0);
    } catch {}

    try {
      const { data: pending } = await authApi.pendingApprovals();
      setPendingApprovals(Array.isArray(pending) ? pending.length : 0);
    } catch {}

    if (user) {
      try {
        const { data: notifs } = await notificationsApi.list(true);
        setNotifications(Array.isArray(notifs) ? notifs.slice(0, 10) : []);
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh when returns to tab
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, location.pathname]);

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

  const getContent = () => {
    if (subPath.startsWith("interested-candidates/")) {
      const leadId = subPath.replace("interested-candidates/", "");
      return <AdminInterestedCandidateDetail leadId={leadId} />;
    }
    if (subPath.startsWith("candidates/")) {
      const candidateId = subPath.replace("candidates/", "");
      return <AdminCandidateDetail candidateId={candidateId} />;
    }
    if (subPath.startsWith("recruiters/")) {
      const recruiterId = subPath.replace("recruiters/", "");
      return <AdminRecruiterDetail id={recruiterId} />;
    }
    
    switch (subPath) {
      case "approvals": return <AdminApprovalsPage />;
      case "referrals": return <AdminReferralsPage />;
      case "config": return <AdminConfigPage />;
      case "reports": return <AdminReportsPage />;
      case "audit": return <AdminGlobalAuditTab />;
      case "billing-run": return <AdminBillingRunPage />;
      case "subscriptions": return <AdminSubscriptionPlansPage />;
      case "users": return <AdminUsersPage />;
      case "jobs": return <AdminJobsPage />;
      case "candidates": return <AdminCandidatesPage />;
      case "interested-candidates": return <AdminInterestedCandidatesPage />;
      case "recruiters": return <AdminRecruitersPage />;
      case "payments": return <AdminPaymentsPage />;
      case "notifications": return <AdminNotificationsPage />;
      case "settings": return <AdminSettingsPage />;
      default: break;
    }

    const pipelineWidgets = [
      { key: "pending_approvals", label: "Pending Approvals", count: pendingApprovals, icon: <Shield className="h-4 w-4" />, link: "/admin-dashboard/approvals", color: "bg-destructive/10 text-destructive" },
      { key: "lead", label: "New Leads", count: pipelineCounts["lead"] || 0, icon: <Activity className="h-4 w-4" />, filter: "lead", color: "bg-muted" },
      { key: "approved", label: "Approved", count: pipelineCounts["approved"] || 0, icon: <CheckCircle className="h-4 w-4" />, filter: "approved", color: "bg-secondary/10" },
      { key: "intake_submitted", label: "Intake → Awaiting Roles", count: pipelineCounts["intake_submitted"] || 0, icon: <FileText className="h-4 w-4" />, filter: "intake_submitted", color: "bg-accent/10" },
      { key: "roles_published", label: "Roles → Awaiting Confirmation", count: pipelineCounts["roles_published"] || 0, icon: <Briefcase className="h-4 w-4" />, filter: "roles_published", color: "bg-accent/15" },
      { key: "roles_confirmed", label: "Roles → Awaiting Payment", count: pipelineCounts["roles_confirmed"] || 0, icon: <ClipboardList className="h-4 w-4" />, filter: "roles_confirmed", color: "bg-accent/20" },
      { key: "payment_completed", label: "Payment Completed", count: pipelineCounts["payment_completed"] || 0, icon: <DollarSign className="h-4 w-4" />, filter: "payment_completed", color: "bg-secondary/20" },
      { key: "credentials_submitted", label: "Credentials Ready", count: pipelineCounts["credentials_submitted"] || 0, icon: <Briefcase className="h-4 w-4" />, filter: "credentials_submitted", color: "bg-secondary/30" },
      { key: "active_marketing", label: "Active Marketing", count: pipelineCounts["active_marketing"] || 0, icon: <Activity className="h-4 w-4" />, filter: "active_marketing", color: "bg-secondary/40" },
      { key: "placed_closed", label: "Placed", count: pipelineCounts["placed_closed"] || 0, icon: <Users className="h-4 w-4" />, filter: "placed_closed", color: "bg-secondary text-secondary-foreground" },
      { key: "billing_alerts", label: "Billing Alerts", count: billingAlerts, icon: <AlertTriangle className="h-4 w-4" />, link: "/admin-dashboard/billing-run", color: billingAlerts > 0 ? "bg-destructive/10 text-destructive" : "bg-muted" },
      { key: "paused", label: "Paused", count: pipelineCounts["paused"] || 0, icon: <AlertTriangle className="h-4 w-4" />, filter: "paused", color: "bg-accent/30" },
      { key: "training_clicks", label: "Training Clicks (7d / 30d)", count: trainingClicks7d, icon: <MousePointer className="h-4 w-4" />, link: "/admin-dashboard/config", color: "bg-muted", subtitle: `${trainingClicks7d} / ${trainingClicks30d}` },
    ];

    const filteredCandidates = activeFilter
      ? candidates.filter(c => c.status === activeFilter)
      : candidates;

    return (
      <>
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
            <DataTable
              data={filteredCandidates}
              isLoading={loading}
              searchKey="full_name"
              searchPlaceholder="Search candidates by name..."
              columns={[
                { 
                  header: "ID", 
                  render: (c: any) => (
                    <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-mono">
                      {c.display_id || `HYRCDT${c.id.toString().slice(-6).toUpperCase()}`}
                    </span>
                  ),
                  sortable: true,
                  accessorKey: "id",
                  className: "text-xs pl-4" 
                },
                { header: "Name", accessorKey: "full_name", className: "text-xs font-semibold", sortable: true },
                { header: "Email", accessorKey: "email", className: "text-xs font-semibold", sortable: true },
                { 
                  header: "Status", 
                  render: (c: any) => <StatusBadge status={c.status} />,
                  className: "text-xs font-semibold",
                  sortable: true,
                  accessorKey: "status"
                },
                {
                  header: "Joined",
                  render: (c: any) => (
                    <div className="text-[10px]">
                      <p className="font-bold">{formatDate(c.created_at)}</p>
                      <p className="opacity-50">{c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</p>
                    </div>
                  ),
                  sortable: true,
                  accessorKey: "created_at"
                },
                { 
                  header: "Change Status", 
                  render: (c: any) => (
                    <Select value={c.status} onValueChange={(val) => handleStatusChange(c.id, val)}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ),
                  className: "text-xs font-semibold"
                },
                { 
                  header: "Actions", 
                  render: (c: any) => (
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => navigate(`/admin-dashboard/candidates/${c.id}`)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View Detail
                    </Button>
                  ),
                  className: "text-xs font-semibold text-right pr-4"
                }
              ]}
            />
            {filteredCandidates.length > 5 && (
              <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recruiters List */}
        {!activeFilter && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">All Recruiters</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={recruiters}
                isLoading={loading}
                searchKey="full_name"
                searchPlaceholder="Search recruiters by name..."
                columns={[
                  { 
                    header: "Name", 
                    accessorKey: "full_name", 
                    className: "text-xs font-semibold", 
                    sortable: true,
                    render: (r: any) => {
                      const name = r.full_name || r.profile?.full_name || "Unknown";
                      const email = r.email;
                      return (
                        <div className="flex flex-col">
                          <p className="font-bold text-sm">{name}</p>
                          <p className="text-[11px] text-muted-foreground">{email}</p>
                        </div>
                      );
                    }
                  },
                  { 
                    header: "Role", 
                    sortable: true,
                    accessorKey: "role",
                    className: "font-bold text-xs uppercase text-center",
                    render: (r: any) => (
                      <div className="flex justify-center">
                        <StatusBadge status={r.role?.replace("_", " ")} />
                      </div>
                    )
                  },
                  {
                    header: "Assigned To",
                    className: "font-bold text-xs uppercase text-center",
                    render: (r: any) => (
                      <div className="flex justify-center">
                        <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {r.assigned_candidate_count || 0} Candidates
                        </span>
                      </div>
                    )
                  },
                  { 
                    header: "Status", 
                    sortable: true,
                    accessorKey: "approval_status",
                    className: "text-xs text-center",
                    render: (r: any) => (
                      <div className="flex justify-center">
                        <StatusBadge status={r.approval_status} />
                      </div>
                    )
                  },
                  {
                    header: "Joined",
                    render: (r: any) => (
                      <div className="text-[10px]">
                        <p className="font-bold">{formatDate(r.created_at)}</p>
                      </div>
                    ),
                    sortable: true,
                    accessorKey: "created_at"
                  },
                  { 
                    header: "Actions", 
                    className: "text-right font-bold text-xs pr-4",
                    render: (r: any) => (
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs px-2"
                          onClick={() => navigate(`/admin-dashboard/recruiters/${r.id}`)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View Detail
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
              {recruiters.length > 5 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  return (
    <DashboardLayout 
      title={subPath === "" ? "Admin Operations" : subPath.charAt(0).toUpperCase() + subPath.slice(1).replace(/-/g, " ")} 
      navItems={navItems}
    >
      <div key={location.pathname} className="animate-in fade-in duration-500">
        {getContent()}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
