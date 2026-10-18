import { useState, useEffect } from "react";
import { recruitersApi, authApi } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Mail, Phone, MapPin, RefreshCw, BarChart3, TrendingUp, Calendar, Briefcase, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  candidate: "bg-blue-100 text-blue-800",
  recruiter: "bg-teal-100 text-teal-800",
  team_lead: "bg-orange-100 text-orange-800",
  team_manager: "bg-pink-100 text-pink-800",
};

const AdminRecruitersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Performance Modal State
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.allUsers();
      const list = data?.results ?? data ?? [];
      const ROLE_PREFIX: Record<string, string> = {
        candidate: 'HYRCDT', recruiter: 'HYRREC',
        team_lead: 'HYRTLD', team_manager: 'HYRTMG',
        admin: 'HYRADM', finance_admin: 'HYRFIN',
      };
      const formattedList = list
        .filter((u: any) => u.role === "recruiter" || u.role === "team_lead" || u.role === "team_manager")
        .map((u: any) => {
          const prefix = ROLE_PREFIX[u.role] || 'HYRREC';
          const rawId = u.display_id || '';
          const hasPrefix = Object.values(ROLE_PREFIX).some(p => rawId.startsWith(p));
          const cleanDisplayId = hasPrefix ? rawId : `${prefix}${u.id.toString().slice(-6).toUpperCase()}`;
          return {
            ...u,
            full_name: u.full_name || u.profile?.full_name || "",
            display_id: cleanDisplayId,
            date_joined: u.date_joined || u.created_at
          };
        });
      setRecruiters(formattedList);
    } catch (err: any) {
      toast({ title: "Error fetching recruiters", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchRecruiters(); }, []);

  const handleViewPerformance = async (recruiter: any) => {
    setSelectedRecruiter(recruiter);
    setLoadingStats(true);
    setStats(null);
    try {
      const { data } = await recruitersApi.stats({ user_id: recruiter.id } as any);
      setStats(data);
    } catch (err) {
      toast({ title: "Failed to load stats", variant: "destructive" });
    } finally {
      setLoadingStats(false);
    }
  };

  const filtered = recruiters.filter(r => {
    const matchesRole = roleFilter === "all" 
      ? true 
      : roleFilter === "team_lead"
        ? (r.role === "team_lead" || r.role === "team_manager")
        : r.role === roleFilter;

    const accStatus = r.account_status || (r.is_active !== false ? "active" : "inactive");
    const matchesStatus = statusFilter === "all"
      ? true
      : statusFilter === "pending"
        ? (r.approval_status === "pending")
        : accStatus === statusFilter;

    return matchesRole && matchesStatus;
  });

  const totalCount = recruiters.length;
  const activeCount = recruiters.filter(r => (r.account_status || (r.is_active !== false ? "active" : "inactive")) === "active").length;
  const teamLeadCount = recruiters.filter(r => r.role === "team_lead" || r.role === "team_manager").length;
  const pendingCount = recruiters.filter(r => (r.approval_status || "pending") === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Recruiters</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and monitor recruiters across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRecruiters} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Recruiters", value: totalCount, filterKey: "all", filterType: "all", color: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300", active: roleFilter === "all" && statusFilter === "all" },
          { label: "Active", value: activeCount, filterKey: "active", filterType: "status", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", active: statusFilter === "active" },
          { label: "Team Leads", value: teamLeadCount, filterKey: "team_lead", filterType: "role", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300", active: roleFilter === "team_lead" },
          { label: "Pending Approval", value: pendingCount, filterKey: "pending", filterType: "status", color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300", active: statusFilter === "pending" },
        ].map(c => {
          const isActive = c.active;
          return (
            <Card
              key={c.label}
              className={`${c.color} border-0 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                isActive ? "ring-2 ring-teal-500 dark:ring-teal-400 shadow-md" : "opacity-75 hover:opacity-100"
              }`}
              onClick={() => {
                if (c.filterType === "all") {
                  setRoleFilter("all");
                  setStatusFilter("all");
                } else if (c.filterType === "role") {
                  setRoleFilter(prev => prev === c.filterKey ? "all" : c.filterKey);
                } else if (c.filterType === "status") {
                  setStatusFilter(prev => prev === c.filterKey ? "all" : c.filterKey);
                }
              }}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-sm font-medium">{c.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44 h-9 text-xs">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="recruiter">Recruiter</SelectItem>
            <SelectItem value="team_lead">Team Lead / Manager</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>

        {(roleFilter !== "all" || statusFilter !== "all") && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setRoleFilter("all"); setStatusFilter("all"); }} 
            className="h-9 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </Button>
        )}
        <span className="text-sm text-muted-foreground font-medium ml-auto">{filtered.length} recruiter(s) found</span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recruiter Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filtered}
            isLoading={loading}
            searchPlaceholder="Search recruiters by name..."
            searchKey="full_name"
            emptyMessage="No recruiters found."
            columns={[
              { 
                header: "ID", 
                render: (r: any) => (
                  <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap font-mono">
                    {r.display_id}
                  </span>
                ),
                sortable: true,
                accessorKey: "display_id",
                className: "text-xs pl-4"
              },
              { 
                header: "Recruiter", 
                sortable: true,
                accessorKey: "full_name",
                className: "text-xs font-medium",
                render: (r: any) => (
                  <div>
                    <p className="font-bold text-sm text-foreground">{r.full_name || "(name not set)"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />{r.email}
                    </p>
                  </div>
                )
              },
              { 
                header: "Role", 
                sortable: true,
                accessorKey: "role",
                className: "text-xs",
                render: (r: any) => (
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[r.role] || "bg-teal-100 text-teal-800"}`}>
                    {r.role?.replace(/_/g, " ")}
                  </span>
                )
              },
              {
                header: "Assigned Candidates",
                sortable: true,
                accessorKey: "assigned_candidate_count",
                className: "text-xs text-center",
                render: (r: any) => (
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {r.assigned_candidate_count || 0}
                  </Badge>
                )
              },
              { 
                header: "Education", 
                className: "text-xs min-w-[150px]",
                render: (r: any) => (
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-[11px] truncate max-w-[150px]">{r.university || r.profile?.university || "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                      {r.degree || r.profile?.degree || "—"}{(r.major || r.profile?.major) ? ` / ${r.major || r.profile?.major}` : ""}
                    </p>
                  </div>
                )
              },
              { 
                header: "Contact", 
                className: "text-xs",
                render: (r: any) => {
                  const phone = r.phone || r.profile?.phone;
                  const location = [r.city || r.profile?.city, r.state || r.profile?.state, r.country || r.profile?.country].filter(Boolean).join(", ");
                  return (
                    <div className="text-xs space-y-0.5">
                      {phone ? <p className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{phone}</p> : null}
                      {location ? <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</p> : null}
                      {!phone && !location && <span className="text-muted-foreground">—</span>}
                    </div>
                  );
                }
              },
              { 
                header: "Approval Status", 
                sortable: true,
                accessorKey: "approval_status",
                className: "text-xs",
                render: (r: any) => (
                  <StatusBadge status={r.approval_status || "pending"} />
                )
              },
              { 
                header: "Account Status", 
                sortable: true,
                accessorKey: "account_status",
                className: "text-xs",
                render: (r: any) => {
                  const accStatus = r.account_status || (r.is_active !== false ? "active" : "inactive");
                  return <StatusBadge status={accStatus} />;
                }
              },
              { 
                header: "Joined", 
                sortable: true,
                accessorKey: "date_joined",
                className: "text-xs",
                render: (r: any) => (
                  <div className="text-[10px]">
                    <p className="font-bold">{formatDate(r.date_joined || r.created_at)}</p>
                    <p className="opacity-50">{r.date_joined ? new Date(r.date_joined).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</p>
                  </div>
                )
              },
              { 
                header: "Actions", 
                className: "text-xs text-right pr-4",
                render: (r: any) => (
                  <div className="flex justify-end gap-1.5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs px-2"
                      onClick={() => navigate(`/admin-dashboard/recruiters/${r.id}`)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs px-2"
                      onClick={() => handleViewPerformance(r)}
                    >
                      <BarChart3 className="mr-1 h-3 w-3" /> Analytics
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Performance Stats Modal */}
      <Dialog open={!!selectedRecruiter} onOpenChange={() => setSelectedRecruiter(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">{selectedRecruiter?.full_name}'s Performance</DialogTitle>
            <DialogDescription>Detailed metrics and submission output analytics.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {loadingStats ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-60" />
                <p className="text-sm font-medium text-muted-foreground">Calculating metrics...</p>
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Today Card */}
                  <Card className="border shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Output</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">{stats.apps_today}</span>
                        <span className="text-xs text-muted-foreground">applications</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Week Card */}
                  <Card className="border shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Total</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">{stats.apps_week}</span>
                        <span className="text-xs text-muted-foreground">submissions</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interviews</p>
                      <p className="text-base font-bold text-foreground">Scheduled This Week</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-amber-600 pr-2">{stats.interviews_week}</span>
                </div>

                <div className="bg-primary/5 rounded-xl p-3.5 flex gap-2.5 text-xs text-primary font-medium border border-primary/10">
                  <BarChart3 className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Performance is calculated based on daily submission logs and job link status updates from the last 7 days.</p>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-muted-foreground font-medium">Unable to load metrics.</div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedRecruiter(null)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecruitersPage;
