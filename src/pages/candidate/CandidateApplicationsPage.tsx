import { useState, useEffect, useMemo } from "react";
import { recruitersApi } from "@/services/api";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, ClipboardList, UserPlus, ExternalLink, MessageSquare, Globe, ChevronDown, X, Search } from "lucide-react";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/DatePicker";

const JobDescriptionCell = ({ 
  company, 
  role, 
  description, 
  onReadMore 
}: { 
  company: string; 
  role: string; 
  description?: string; 
  onReadMore: (company: string, role: string, desc: string) => void; 
}) => {
  if (!description) return <span className="text-muted-foreground">—</span>;
  
  const isLengthy = description.length > 100;
  if (!isLengthy) {
    return <span className="text-xs whitespace-pre-wrap">{description}</span>;
  }
  
  const preview = description.slice(0, 100) + "...";
  return (
    <div className="text-xs">
      <span>{preview}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReadMore(company, role, description);
        }}
        className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
      >
        Read More
      </button>
    </div>
  );
};


const navItems = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Refer a Friend", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
];

const CANDIDATE_STATUSES = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "screening_scheduled", label: "Screening Scheduled" },
  { value: "interview", label: "Interview" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "no_response", label: "No Response" },
];

interface CandidateApplicationsPageProps {
  candidate: any;
}

const CandidateApplicationsPage = ({ candidate }: CandidateApplicationsPageProps) => {
  const { toast } = useToast();
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});
  const [activeJobDesc, setActiveJobDesc] = useState<{ company: string; role: string; description: string } | null>(null);

  const [searchRole, setSearchRole] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredJobPostings = useMemo(() => {
    return jobPostings.filter(j => {
      const matchRole = !searchRole || j.role_title?.toLowerCase().includes(searchRole.toLowerCase());
      const matchCompany = !searchCompany || j.company_name?.toLowerCase().includes(searchCompany.toLowerCase());
      
      let matchDate = true;
      const logDateStr = j.log_date || j.created_at;
      if (logDateStr) {
        // Construct date at local midnight to avoid timezone shift
        const cleanDate = logDateStr.split("T")[0];
        const [y, m, d] = cleanDate.split("-").map((s: string) => parseInt(s, 10));
        const itemDate = new Date(y, m - 1, d);
        itemDate.setHours(0, 0, 0, 0);

        if (fromDate) {
          const fParts = fromDate.split(/[-\/]/);
          if (fParts.length === 3) {
            const fd = new Date(parseInt(fParts[2], 10), parseInt(fParts[0], 10) - 1, parseInt(fParts[1], 10));
            fd.setHours(0, 0, 0, 0);
            if (itemDate < fd) matchDate = false;
          }
        }
        
        if (toDate) {
          const tParts = toDate.split(/[-\/]/);
          if (tParts.length === 3) {
            const td = new Date(parseInt(tParts[2], 10), parseInt(tParts[0], 10) - 1, parseInt(tParts[1], 10));
            td.setHours(23, 59, 59, 999);
            if (itemDate > td) matchDate = false;
          }
        }
      } else {
        if (fromDate || toDate) matchDate = false;
      }

      const currentStatus = j.candidate_response_status || j.status || j.application_status;
      const matchAction = actionFilter === "all" || currentStatus?.toLowerCase() === actionFilter.toLowerCase();
      
      return matchRole && matchCompany && matchDate && matchAction;
    });
  }, [jobPostings, searchRole, searchCompany, fromDate, toDate, actionFilter]);

  const handleOpenDescription = (company: string, role: string, description: string) => {
    setActiveJobDesc({ company, role, description });
  };

  useEffect(() => {
    if (!candidate?.id) return;
    let isFirstLoad = true;
    const fetchData = async () => {
      if (isFirstLoad) setLoading(true);
      const backgroundConfig = !isFirstLoad ? { headers: { 'X-Background-Request': 'true' } } : undefined;
      try {
        const [logsRes, jobsRes] = await Promise.all([
          recruitersApi.getDailyLogs(candidate.id, backgroundConfig).catch(() => ({ data: [] })),
          recruitersApi.getJobApplications(candidate.id, backgroundConfig).catch(() => ({ data: [] })),
        ]);
        const logs = logsRes.data || [];
        setDailyLogs(logs);

        // Merge daily-log job entries + recruiter-submitted job applications
        const logJobs = logs.flatMap((l: any) => 
          (l.job_entries || []).map((j: any) => ({ 
            ...j, 
            log_date: l.log_date || l.created_at 
          }))
        );
        const recruiterJobs = (jobsRes.data || []).map((j: any) => ({
          ...j,
          log_date: j.log_date || j.created_at,
        }));

        // De-duplicate by id (in case any overlap)
        const seen = new Set<string>();
        const merged: any[] = [];
        for (const j of [...recruiterJobs, ...logJobs]) {
          if (!seen.has(j.id)) {
            seen.add(j.id);
            merged.push(j);
          }
        }
        setJobPostings(merged);
      } catch (err: any) {
        console.error("Error fetching applications:", err);
        if (isFirstLoad) {
          toast({ 
            title: "Failed to load applications", 
            description: "There was an error fetching your application history. Please try again later.",
            variant: "destructive" 
          });
        }
        setDailyLogs([]);
        setJobPostings([]);
      } finally {
        if (isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };
    fetchData();

    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [candidate?.id, candidate?.updated_at]); // Depend on updated_at to refresh when parent refreshes

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    setUpdatingJob(jobId);
    try {
      await recruitersApi.updateJobStatus(jobId, newStatus);
      toast({ title: "Status updated" });
      setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, candidate_response_status: newStatus, application_status: newStatus } : j));
      setStatusNotes(prev => ({ ...prev, [jobId]: "" }));
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setUpdatingJob(null);
  };

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  // Robust count logic using date slicing and created_at fallback
  const todayCount = dailyLogs
    .filter(l => (l.log_date || l.created_at)?.split("T")[0] === today)
    .reduce((s, l) => s + (l.applications_count || 0), 0) +
    jobPostings.filter(j => (j.log_date || j.created_at)?.split("T")[0] === today).length;
    
  const weekCount = dailyLogs
    .filter(l => (l.log_date || l.created_at)?.split("T")[0] >= weekAgo)
    .reduce((s, l) => s + (l.applications_count || 0), 0) +
    jobPostings.filter(j => (j.log_date || j.created_at)?.split("T")[0] >= weekAgo).length;
    
  const monthCount = dailyLogs
    .filter(l => (l.log_date || l.created_at)?.split("T")[0] >= monthAgo)
    .reduce((s, l) => s + (l.applications_count || 0), 0) +
    jobPostings.filter(j => (j.log_date || j.created_at)?.split("T")[0] >= monthAgo).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {loading ? <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading applications...</p></div> : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Today", value: todayCount },
              { label: "This Week", value: weekCount },
              { label: "This Month", value: monthCount },
              { label: "Total Applications", value: jobPostings.length },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-card-foreground">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Master Application Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-secondary" /> 
                All Submissions ({jobPostings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pt-4 pb-2">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 mb-4 items-end">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search by Role</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        placeholder="e.g. Frontend"
                        value={searchRole}
                        onChange={(e) => setSearchRole(e.target.value)}
                        className="pl-8 pr-8 h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full"
                      />
                      {searchRole && (
                        <button
                          onClick={() => setSearchRole("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search by Company</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        placeholder="e.g. Google"
                        value={searchCompany}
                        onChange={(e) => setSearchCompany(e.target.value)}
                        className="pl-8 pr-8 h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full"
                      />
                      {searchCompany && (
                        <button
                          onClick={() => setSearchCompany("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From Date</Label>
                    <DatePicker
                      value={fromDate}
                      onChange={setFromDate}
                      placeholder="MM-DD-YYYY"
                      formatStr="MM-dd-yyyy"
                      className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors font-semibold w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Date</Label>
                    <DatePicker
                      value={toDate}
                      onChange={setToDate}
                      placeholder="MM-DD-YYYY"
                      formatStr="MM-dd-yyyy"
                      className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors font-semibold w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</Label>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full">
                        <SelectValue placeholder="All Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Actions</SelectItem>
                        {CANDIDATE_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DataTable
                data={filteredJobPostings}
                isLoading={loading}
                emptyMessage="No applications submitted yet."
                columns={[
                  { 
                    header: "ID", 
                    render: (j: any) => (
                      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                        {`HYRSUB${j.id.toString().slice(-6).toUpperCase()}`}
                      </span>
                    ),
                    className: "pl-6"
                  },
                  { 
                    header: "Company Name", 
                    accessorKey: "company_name",
                    sortable: true,
                    className: "font-medium text-sm"
                  },
                  { 
                    header: "Role Title", 
                    accessorKey: "role_title",
                    sortable: true,
                    className: "text-sm"
                  },
                  { 
                    header: "Job Description", 
                    render: (j: any) => (
                      <JobDescriptionCell 
                        company={j.company_name} 
                        role={j.role_title} 
                        description={j.job_description} 
                        onReadMore={handleOpenDescription} 
                      />
                    )
                  },
                  { 
                    header: "Job Link", 
                    render: (j: any) => (
                      j.job_url ? (
                        <DocumentPreview 
                          url={j.job_url} 
                          label="View Job" 
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        />
                      ) : "—"
                    )
                  },
                  { 
                    header: "Resume Link", 
                    render: (j: any) => (
                      j.resume_used ? (
                        j.resume_used.startsWith('http') ? (
                          <DocumentPreview 
                            url={j.resume_used} 
                            label="View Resume" 
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          />
                        ) : (
                          <span className="text-xs font-mono opacity-80">{j.resume_used}</span>
                        )
                      ) : "—"
                    )
                  },
                  { 
                    header: "Recruiter Status", 
                    render: (j: any) => <StatusBadge status={j.candidate_response_status || j.status || j.application_status} />
                  },
                  { 
                    header: "Logged Date", 
                    render: (j: any) => <span className="text-[11px] text-muted-foreground font-medium">{formatDate(j.log_date)}</span>
                  },
                  { 
                    header: "Actions", 
                    className: "pr-6 text-right",
                    render: (j: any) => (
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={j.candidate_response_status || j.application_status || ""}
                          onValueChange={(val) => handleStatusUpdate(j.id, val)}
                          disabled={updatingJob === j.id}
                        >
                          <SelectTrigger className="w-32 h-8 text-[10px] font-bold border-none bg-muted-50">
                            <SelectValue placeholder="Update..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CANDIDATE_STATUSES.map(s => (
                              <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  }
                ]}
              />
              {filteredJobPostings.length > 5 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Summary grouping (Optional) */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold opacity-70">Daily Summary</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {dailyLogs.map((log: any) => (
                  <AccordionItem key={log.id} value={log.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-4 text-left">
                        <span className="text-sm font-bold">{formatDate(log.log_date)}</span>
                        <span className="text-xs text-muted-foreground">{log.applications_count} applications logged</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {log.notes && <p className="text-sm text-muted-foreground italic border-l-2 pl-3 border-secondary/30">{log.notes}</p>}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {dailyLogs.length > 5 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group mt-2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
            </CardContent>
          </Card>


          {/* Drive folder link */}
          {candidate?.drive_folder_url && (
            <Card>
              <CardContent className="p-4">
                <DocumentPreview 
                  url={candidate.drive_folder_url} 
                  label="View Resume Folder" 
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={!!activeJobDesc} onOpenChange={(open) => !open && setActiveJobDesc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-2xl p-6 shadow-2xl border border-border/50">
          <DialogHeader className="border-b border-border/10 pb-4">
            <DialogTitle className="text-lg font-bold flex flex-col gap-1 text-left">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Job Description</span>
              <span className="text-card-foreground">{activeJobDesc?.role}</span>
              <span className="text-primary text-sm font-medium">{activeJobDesc?.company}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-[55vh] overflow-y-auto pr-2">
            {activeJobDesc?.description}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CandidateApplicationsPage;
