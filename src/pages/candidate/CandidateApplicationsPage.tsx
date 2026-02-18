import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, ClipboardList, UserPlus, ExternalLink, MessageSquare } from "lucide-react";

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
      const { data: logs } = await supabase
        .from("daily_submission_logs")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("log_date", { ascending: false });
      setDailyLogs(logs || []);

      if (logs && logs.length > 0) {
        const logIds = logs.map((l: any) => l.id);
        const { data: jobs } = await supabase
          .from("job_postings")
          .select("*")
          .in("submission_log_id", logIds)
          .order("created_at", { ascending: false });
        setJobPostings(jobs || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [candidate?.id]);

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    setUpdatingJob(jobId);
    const { error } = await supabase.rpc("add_job_status_update", {
      _job_posting_id: jobId,
      _status: newStatus,
      _notes: statusNotes[jobId] || "",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
      setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, candidate_response_status: newStatus } : j));
      setStatusNotes(prev => ({ ...prev, [jobId]: "" }));
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
    <DashboardLayout title="My Applications" navItems={navItems}>
      {loading ? <p className="text-muted-foreground">Loading...</p> : (
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

          {/* Daily Logs grouped */}
          {dailyLogs.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">No applications submitted yet. Your recruiter will begin submitting once marketing starts.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Submission History</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  {dailyLogs.map((log: any) => {
                    const logJobs = jobPostings.filter((j: any) => j.submission_log_id === log.id);
                    return (
                      <AccordionItem key={log.id} value={log.id}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-4 text-left">
                            <span className="font-medium">{new Date(log.log_date).toLocaleDateString()}</span>
                            <span className="text-sm text-muted-foreground">{log.applications_count} applications</span>
                            {logJobs.length > 0 && <span className="text-xs text-muted-foreground">({logJobs.length} links)</span>}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {log.notes && <p className="mb-3 text-sm text-muted-foreground">{log.notes}</p>}
                          {logJobs.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Company</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead>Recruiter Status</TableHead>
                                  <TableHead>Your Update</TableHead>
                                  <TableHead>Link</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {logJobs.map((j: any) => (
                                  <TableRow key={j.id}>
                                    <TableCell className="font-medium">{j.company_name || "—"}</TableCell>
                                    <TableCell>{j.role_title || "—"}</TableCell>
                                    <TableCell><StatusBadge status={j.status} /></TableCell>
                                    <TableCell>
                                      {j.candidate_response_status ? (
                                        <StatusBadge status={j.candidate_response_status} />
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Not set</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {j.job_url ? (
                                        <a href={j.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                          View <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : "—"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={j.candidate_response_status || ""}
                                          onValueChange={(val) => handleStatusUpdate(j.id, val)}
                                          disabled={updatingJob === j.id}
                                        >
                                          <SelectTrigger className="w-32 h-8 text-xs">
                                            <SelectValue placeholder="Update..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {CANDIDATE_STATUSES.map(s => (
                                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : <p className="text-sm text-muted-foreground">No job links for this day.</p>}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          )}

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
    </DashboardLayout>
  );
};

export default CandidateApplicationsPage;
