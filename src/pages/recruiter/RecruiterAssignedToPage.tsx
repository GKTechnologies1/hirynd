import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { recruitersApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, TrendingUp, UserCheck, Shield, Crown } from "lucide-react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

const ROLE_TYPE_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  primary_recruiter: { label: "Primary Recruiter", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: <Crown className="h-3 w-3" /> },
  secondary_recruiter: { label: "Secondary Recruiter", color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: <UserCheck className="h-3 w-3" /> },
  team_lead: { label: "Team Lead", color: "bg-purple-500/10 text-purple-700 border-purple-500/20", icon: <Shield className="h-3 w-3" /> },
  team_manager: { label: "Team Manager", color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: <Shield className="h-3 w-3" /> },
};

const RecruiterAssignedToPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetchAssignments = async () => {
      try {
        const res = await recruitersApi.myAssignments();
        setAssignments(res.data || []);
      } catch (err) {
        console.error("Failed to fetch assignments:", err);
        setAssignments([]);
      }
      setLoading(false);
    };
    fetchAssignments();
  }, [user]);

  const filteredAssignments = assignments.filter((a) => {
    const candidateId = a.candidate_display_id || `HYRCDT${(a.candidate_id || a.id)?.toString().slice(-6).toUpperCase()}`;
    const matchesSearch =
      !search ||
      a.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.candidate_email?.toLowerCase().includes(search.toLowerCase()) ||
      candidateId.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || a.role_type === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stats
  const totalAssigned = assignments.length;
  const primaryCount = assignments.filter((a) => a.role_type === "primary_recruiter").length;
  const secondaryCount = assignments.filter((a) => a.role_type === "secondary_recruiter").length;
  const otherCount = totalAssigned - primaryCount - secondaryCount;

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground font-medium flex items-center justify-center gap-2">
        <TrendingUp className="h-4 w-4 animate-pulse" /> Loading assignments...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Assigned", value: totalAssigned, icon: <Users className="h-4 w-4 text-primary" />, color: "bg-primary/10" },
          { label: "Primary Recruiter", value: primaryCount, icon: <Crown className="h-4 w-4 text-emerald-600" />, color: "bg-emerald-500/10" },
          { label: "Secondary Recruiter", value: secondaryCount, icon: <UserCheck className="h-4 w-4 text-blue-600" />, color: "bg-blue-500/10" },
          { label: "Other Roles", value: otherCount, icon: <Shield className="h-4 w-4 text-purple-600" />, color: "bg-purple-500/10" },
        ].map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.35 }}
          >
            <Card className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <h3 className="text-2xl font-bold mt-1">{s.value}</h3>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center`}>
                    {s.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-6 border-b border-border/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5 text-secondary" /> Assigned Candidates
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Candidates currently assigned to your recruiter profile
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                {!search && <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                <Input
                  placeholder="Search ID, name or email..."
                  className="pl-9 text-sm h-9 bg-background/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px] h-9 text-xs bg-background/50">
                  <SelectValue placeholder="Relation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="primary_recruiter">Primary Recruiter</SelectItem>
                  <SelectItem value="secondary_recruiter">Secondary Recruiter</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="team_manager">Team Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredAssignments}
            isLoading={loading}
            searchPlaceholder="Filter results..."
            searchKey="candidate_name"
            emptyMessage="No candidates are currently assigned to you."
            columns={[
              {
                header: "Hyrind ID",
                className: "px-6",
                render: (a: any) => (
                  <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap font-mono">
                    {a.candidate_display_id || `HYRCDT${(a.candidate_id || a.id)?.toString().slice(-6).toUpperCase()}`}
                  </span>
                ),
              },
              {
                header: "Name",
                className: "px-6",
                render: (a: any) => (
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{a.candidate_name || "—"}</span>
                  </div>
                ),
              },
              {
                header: "Mail ID",
                className: "px-6",
                render: (a: any) => (
                  <span className="text-sm text-muted-foreground">{a.candidate_email || "—"}</span>
                ),
              },
              {
                header: "Relation",
                className: "px-6",
                render: (a: any) => {
                  const role = ROLE_TYPE_MAP[a.role_type] || {
                    label: a.role_type?.replace(/_/g, " ") || "Unknown",
                    color: "bg-muted text-muted-foreground border-border",
                    icon: <UserCheck className="h-3 w-3" />,
                  };
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${role.color}`}>
                      {role.icon}
                      {role.label}
                    </span>
                  );
                },
              },
              {
                header: "Pipeline Status",
                className: "px-6",
                render: (a: any) => <StatusBadge status={a.status} />,
              },
              {
                header: "Assigned Since",
                className: "px-6",
                render: (a: any) => (
                  <span className="text-xs text-muted-foreground">
                    {a.assigned_at ? formatDate(a.assigned_at) : "—"}
                  </span>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default RecruiterAssignedToPage;
