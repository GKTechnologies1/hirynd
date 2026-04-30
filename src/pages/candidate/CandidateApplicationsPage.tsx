import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, ClipboardList, UserPlus, ExternalLink, MessageSquare, Globe, ChevronDown } from "lucide-react";
import DocumentPreview from "@/components/dashboard/DocumentPreview";


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
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "rejected", label: "Rejected" },
  { value: "offer", label: "Offer" },
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

  useEffect(() => {
    if (!candidate?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [logsRes, jobsRes] = await Promise.all([
          recruitersApi.getDailyLogs(candidate.id).catch(() => ({ data: [] })),
          recruitersApi.getJobApplications(candidate.id).catch(() => ({ data: [] })),
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
        toast({ 
          title: "Failed to load applications", 
          description: "There was an error fetching your application history. Please try again later.",
          variant: "destructive" 
        });
        setDailyLogs([]);
        setJobPostings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [candidate?.id, candidate?.updated_at]); // Depend on updated_at to refresh when parent refreshes

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    setUpdatingJob(jobId);
    try {
      await recruitersApi.updateJobStatus(jobId, newStatus);
      toast({ title: "Status updated" });
      setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, candidate_response_status: newStatus } : j));
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
    .reduce((s, l) => s + (l.applications_count || 0), 0);
    
  const weekCount = dailyLogs
    .filter(l => (l.log_date || l.created_at)?.split("T")[0] >= weekAgo)
    .reduce((s, l) => s + (l.applications_count || 0), 0);
    
  const monthCount = dailyLogs
    .filter(l => (l.log_date || l.created_at)?.split("T")[0] >= monthAgo)
    .reduce((s, l) => s + (l.applications_count || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {loading ? <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading applications...</p></div> : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Today", value: todayCount },
              { label: "This Week", value: weekCount },
              { label: "This Month", value: monthCount },
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
              <DataTable
                data={jobPostings}
                isLoading={loading}
                searchPlaceholder="Search company or role..."
                searchKey="company_name"
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
                    header: "Company", 
                    accessorKey: "company_name",
                    sortable: true,
                    className: "font-medium text-sm"
                  },
                  { 
                    header: "Role", 
                    accessorKey: "role_title",
                    sortable: true,
                    className: "text-sm"
                  },
                  { 
                    header: "Recruiter Status", 
                    render: (j: any) => <StatusBadge status={j.candidate_response_status || j.status || j.application_status} />
                  },
                  { 
                    header: "Link", 
                    render: (j: any) => (
                      j.job_url ? (
                        <DocumentPreview 
                          url={j.job_url} 
                          label="View" 
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        />
                      ) : "—"
                    )
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
                          value={j.candidate_response_status || ""}
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
              {jobPostings.length > 5 && (
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
    </div>
  );
};

export default CandidateApplicationsPage;
