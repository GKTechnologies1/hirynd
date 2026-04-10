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
import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, ClipboardList, UserPlus, ExternalLink, MessageSquare, Globe } from "lucide-react";


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
      try {
        const { data: logs } = await recruitersApi.getDailyLogs(candidate.id);
        setDailyLogs(logs || []);
        const allJobs = (logs || []).flatMap((l: any) => l.job_entries || []);
        setJobPostings(allJobs);
      } catch {
        setDailyLogs([]);
        setJobPostings([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [candidate?.id]);

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    setUpdatingJob(jobId);
    try {
      await recruitersApi.updateJobStatus(jobId, newStatus);
      toast({ title: "Status updated" });
      setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
      setStatusNotes(prev => ({ ...prev, [jobId]: "" }));
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setUpdatingJob(null);
  };

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const todayCount = dailyLogs.filter(l => l.log_date === today).reduce((s, l) => s + l.applications_count, 0);
  const weekCount = dailyLogs.filter(l => l.log_date >= weekAgo).reduce((s, l) => s + l.applications_count, 0);
  const monthCount = dailyLogs.filter(l => l.log_date >= monthAgo).reduce((s, l) => s + l.applications_count, 0);

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
                    render: (j: any) => <StatusBadge status={j.status} />
                  },
                  { 
                    header: "Your Update", 
                    render: (j: any) => (
                      j.candidate_response_status ? (
                        <StatusBadge status={j.candidate_response_status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Not set</span>
                      )
                    )
                  },
                  { 
                    header: "Link", 
                    render: (j: any) => (
                      j.job_url ? (
                        <a href={j.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"
                    )
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
            </CardContent>
          </Card>


          {/* Drive folder link */}
          {candidate?.drive_folder_url && (
            <Card>
              <CardContent className="p-4">
                <a href={candidate.drive_folder_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                  <FileText className="h-4 w-4" /> View Resume Folder <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CandidateApplicationsPage;
