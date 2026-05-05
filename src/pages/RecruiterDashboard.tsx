import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { recruitersApi, candidatesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import RecruiterCandidateDetail from "@/pages/recruiter/RecruiterCandidateDetail";
import DailyLogPage from "@/pages/recruiter/DailyLogPage";
import RecruiterProfilePage from "@/pages/recruiter/RecruiterProfilePage";
import RecruiterSettingsPage from "@/pages/recruiter/RecruiterSettingsPage";
import RecruiterAssignedToPage from "@/pages/recruiter/RecruiterAssignedToPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ClipboardList, User, Eye, Search, Briefcase, Calendar, TrendingUp, Settings, ChevronDown, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { DatePicker } from "@/components/ui/DatePicker";
import { parse, format } from "date-fns";


const navItems = [
  { label: "My Candidates", path: "/recruiter-dashboard", icon: <Users className="h-4 w-4" /> },
  { label: "Assigned To", path: "/recruiter-dashboard/assigned-to", icon: <UserCheck className="h-4 w-4" /> },
  { label: "Daily Log", path: "/recruiter-dashboard/daily-log", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "My Profile", path: "/recruiter-dashboard/profile", icon: <User className="h-4 w-4" /> },
  { label: "Settings", path: "/recruiter-dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

const RecruiterHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visaFilter, setVisaFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [{ data: candData }, statsRes] = await Promise.all([
          recruitersApi.myCandidates(),
          recruitersApi.stats().catch(err => {
            console.warn("RecruiterDashboard: Stats fetch failed", err);
            return { data: null };
          })
        ]);

        setCandidates(candData || []);
        setStats(statsRes?.data);

        // Auto-open if only one candidate is assigned
        if (candData?.length === 1) {
          navigate(`/recruiter-dashboard/candidates/${candData[0].id}`, { replace: true });
        }
      } catch (err) {
        console.error("RecruiterDashboard: Core data fetch failed", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, navigate, location.pathname]);

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesVisa = visaFilter === "all" || c.profile?.visa_status === visaFilter;

    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const updatedAt = new Date(c.updated_at || c.created_at);

      if (dateRange.start) {
        let dStart = dateRange.start;
        if (dStart.includes("-") && dStart.split("-")[0].length === 2) {
          try {
            const parsed = parse(dStart, "MM-dd-yyyy", new Date());
            if (!isNaN(parsed.getTime())) dStart = format(parsed, "yyyy-MM-dd");
          } catch (e) { }
        }
        if (updatedAt < new Date(dStart)) matchesDate = false;
      }

      if (dateRange.end) {
        let dEnd = dateRange.end;
        if (dEnd.includes("-") && dEnd.split("-")[0].length === 2) {
          try {
            const parsed = parse(dEnd, "MM-dd-yyyy", new Date());
            if (!isNaN(parsed.getTime())) dEnd = format(parsed, "yyyy-MM-dd");
          } catch (e) { }
        }
        if (updatedAt > new Date(dEnd + "T23:59:59")) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesVisa && matchesDate;
  });

  if (loading) return <div className="p-8 text-center text-muted-foreground font-medium flex items-center justify-center gap-2"><TrendingUp className="h-4 w-4 animate-pulse" /> Loading your dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Stats Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Applications", value: stats?.total_apps || 0, icon: <Briefcase className="h-4 w-4 text-primary" />, color: "bg-primary/10" },
          { label: "Total Interviews", value: stats?.total_interviews || 0, icon: <TrendingUp className="h-4 w-4 text-secondary" />, color: "bg-secondary/10" },
          { label: "Applications This Week", value: stats?.apps_week || 0, icon: <ClipboardList className="h-4 w-4 text-emerald-500" />, color: "bg-emerald-500/10" },
          { label: "Interviews This Week", value: stats?.interviews_week || 0, icon: <Calendar className="h-4 w-4 text-amber-500" />, color: "bg-amber-500/10" },
        ].map((s, idx) => (
          <Card key={idx} className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm">
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
        ))}
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-6 border-b border-border/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5 text-secondary" /> Assigned Candidates
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Manage and track your assigned candidate pool</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                {!search && <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                <Input
                  placeholder="Search name or email..."
                  className="pl-9 text-sm h-9 bg-background/50"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-background/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="client_intake">Intake</SelectItem>
                  <SelectItem value="roles_suggested">Roles Suggested</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="active_marketing">Active Marketing</SelectItem>
                  <SelectItem value="placed">Placed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 bg-background/50 border rounded-md px-1.5 h-9 min-w-[300px]">
                <DatePicker
                  value={dateRange.start}
                  onChange={val => setDateRange(prev => ({ ...prev, start: val }))}
                  className="h-7 border-none bg-transparent shadow-none text-[10px] w-32 px-1"
                  placeholder="Start Date"
                />
                <span className="text-muted-foreground">-</span>
                <DatePicker
                  value={dateRange.end}
                  onChange={val => setDateRange(prev => ({ ...prev, end: val }))}
                  className="h-7 border-none bg-transparent shadow-none text-[10px] w-32 px-1"
                  placeholder="End Date"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredCandidates}
            isLoading={loading}
            searchPlaceholder="Filter results..."
            // We use existing filters, but DataTable's internal search can be an extra layer
            searchKey="full_name"
            emptyMessage="No candidates found matching your criteria."
            columns={[
              {
                header: "ID",
                className: "px-6",
                render: (c: any) => (
                  <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap font-mono">
                    {c.display_id || `HYRCDT${c.id.toString().slice(-6).toUpperCase()}`}
                  </span>
                )
              },
              {
                header: "Candidate",
                className: "px-6",
                render: (c: any) => (
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm group-hover:text-secondary transition-colors underline-offset-4 decoration-secondary/30">{c.full_name || "—"}</span>
                    <span className="text-xs text-muted-foreground">{c.email}</span>
                  </div>
                )
              },
              {
                header: "Visa Status",
                className: "px-6",
                render: (c: any) => (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary/10 text-secondary border border-secondary/20 uppercase tracking-tighter">
                    {c.profile?.visa_status || "N/A"}
                  </span>
                )
              },
              {
                header: "Pipeline Status",
                className: "px-6",
                render: (c: any) => <StatusBadge status={c.status} />
              },
              {
                header: "Total Apps",
                className: "px-6 text-center",
                render: (c: any) => (
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                    {c.total_applications ?? 0}
                  </span>
                )
              },
              {
                header: "Total Interviews",
                className: "px-6 text-center",
                render: (c: any) => (
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary">
                    {c.total_interviews ?? 0}
                  </span>
                )
              },
              {
                header: "Last Updated",
                className: "px-6",
                render: (c: any) => (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(c.updated_at || c.created_at)}
                  </span>
                )
              },
              {
                header: "Action",
                className: "px-6 text-right",
                render: (c: any) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 px-4 text-xs font-medium rounded-lg"
                    onClick={() => navigate(`/recruiter-dashboard/candidates/${c.id}`)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Manage
                  </Button>
                )
              }
            ]}
          />
        </CardContent>
        {filteredCandidates.length > 5 && (
          <div className="py-2 flex justify-center border-t border-border/30 bg-muted/10">
            <ChevronDown className="h-4 w-4 text-muted-foreground/40 animate-bounce" />
          </div>
        )}
      </Card>

    </div>
  );
};

const CandidateDetailWrapper = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  return <RecruiterCandidateDetail candidateId={candidateId || ""} />;
};

const RecruiterDashboard = () => {
  return (
    <DashboardLayout title="Recruiter Dashboard" navItems={navItems}>
      <Routes>
        <Route path="/" element={<RecruiterHome />} />
        <Route path="/candidates/:candidateId" element={<CandidateDetailWrapper />} />
        <Route path="/assigned-to" element={<RecruiterAssignedToPage />} />
        <Route path="/daily-log" element={<DailyLogPage />} />
        <Route path="/profile" element={<RecruiterProfilePage />} />
        <Route path="/settings" element={<RecruiterSettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;

