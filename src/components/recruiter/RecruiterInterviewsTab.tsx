import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi } from "@/services/api";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Phone, Plus, ChevronDown, Briefcase, X, Search, Calendar } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LOG_TYPES = [
  { value: "screening_call", label: "Screening Call" },
  { value: "technical_interview", label: "Technical Interview" },
  { value: "hr_interview", label: "HR Interview" },
  { value: "client_round", label: "Client Round" },
  { value: "final_round", label: "Final Round" },
  { value: "mock_interview", label: "Mock Interview" },
  { value: "support_call", label: "Support Call" },
];
const ROUNDS = ["Round 1", "Round 2", "Tech", "Behavioral", "Final"];
const OUTCOMES = ["scheduled", "completed", "selected", "rejected", "follow_up_needed", "rescheduled", "no_show"];

interface RecruiterInterviewsTabProps {
  candidateId: string;
  candidateUserId: string;
  onRefresh?: () => void;
}

const LongTextCell = ({ 
  title, 
  content, 
  companyName, 
  roleTitle, 
  onReadMore 
}: { 
  title: string; 
  content?: string; 
  companyName: string; 
  roleTitle: string; 
  onReadMore: (title: string, content: string, companyName: string, roleTitle: string) => void; 
}) => {
  if (!content) return <span className="text-muted-foreground">—</span>;
  
  const isLengthy = content.length > 100;
  if (!isLengthy) {
    return <span className="text-xs whitespace-pre-wrap text-left w-full block">{content}</span>;
  }
  
  const preview = content.slice(0, 100) + "...";
  return (
    <div className="text-xs text-left w-full">
      <span>{preview}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReadMore(title, content, companyName, roleTitle);
        }}
        className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
      >
        Read More
      </button>
    </div>
  );
};

const OutcomeDropdown = ({ 
  candidateId, 
  log, 
  onUpdateSuccess 
}: { 
  candidateId: string; 
  log: any; 
  onUpdateSuccess: () => void; 
}) => {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const handleOutcomeChange = async (newOutcome: string) => {
    setUpdating(true);
    try {
      await candidatesApi.updateInterview(candidateId, log.id, { outcome: newOutcome });
      toast({ title: "Outcome updated successfully" });
      onUpdateSuccess();
    } catch (err: any) {
      toast({
        title: "Failed to update outcome",
        description: err.response?.data?.error || err.message,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="inline-block relative">
      <Select value={log.outcome} onValueChange={handleOutcomeChange} disabled={updating}>
        <SelectTrigger className="border-none shadow-none bg-transparent hover:bg-muted/50 p-0 h-auto cursor-pointer focus:ring-0">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <StatusBadge status={log.outcome?.toLowerCase().replace(/ /g, "_") || "pending"} />
            <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60 shrink-0" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {OUTCOMES.map(o => (
            <SelectItem key={o} value={o} className="capitalize">
              {o.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};


const RecruiterInterviewsTab = ({ candidateId, candidateUserId, onRefresh }: RecruiterInterviewsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeLongText, setActiveLongText] = useState<{ title: string; content: string; companyName: string; roleTitle: string } | null>(null);

  const [searchRole, setSearchRole] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchRole = !searchRole || l.role_title?.toLowerCase().includes(searchRole.toLowerCase());
      const matchCompany = !searchCompany || l.company_name?.toLowerCase().includes(searchCompany.toLowerCase());
      
      let matchDate = true;
      if (l.interview_date) {
        // Construct date at local midnight to avoid timezone shift
        const [y, m, d] = l.interview_date.split("-").map((s: string) => parseInt(s, 10));
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

      const matchOutcome = outcomeFilter === "all" || l.outcome?.toLowerCase() === outcomeFilter.toLowerCase();
      
      return matchRole && matchCompany && matchDate && matchOutcome;
    });
  }, [logs, searchRole, searchCompany, fromDate, toDate, outcomeFilter]);

  const [logType, setLogType] = useState("screening_call");
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [round, setRound] = useState("");
  const [outcome, setOutcome] = useState("scheduled");
  const [notes, setNotes] = useState("");
  const [difficultQuestions, setDifficultQuestions] = useState("");
  const [supportNeeded, setSupportNeeded] = useState(false);
  const [supportNotes, setSupportNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLogs = async (showLoading = true, isPolling = false) => {
    if (showLoading) setLoading(true);
    const backgroundConfig = isPolling ? { headers: { 'X-Background-Request': 'true' } } : undefined;
    try {
      const { data } = await candidatesApi.getInterviews(candidateId, backgroundConfig);
      setLogs(data || []);
    } catch {
      setLogs([]);
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchLogs(true, false);
    const interval = setInterval(() => {
      fetchLogs(false, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [candidateId]);

  const handleSubmit = async () => {
    if (!companyName.trim() || !roleTitle.trim() || !interviewDate) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }

    // Convert MM-DD-YYYY → YYYY-MM-DD for the backend
    const toISODate = (d: string) => {
      if (!d) return d;
      // Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      // MM-DD-YYYY or MM/DD/YYYY
      const parts = d.split(/[-\/]/);
      if (parts.length === 3 && parts[0].length === 2) return `${parts[2]}-${parts[0]}-${parts[1]}`;
      return d;
    };

    setSaving(true);
    try {
      await candidatesApi.submitInterview(candidateId, {
        interview_type: logType,
        company_name: companyName.trim(),
        role_title: roleTitle.trim(),
        interview_date: toISODate(interviewDate),
        stage_round: round,
        outcome,
        feedback_notes: notes.trim(),
        notes: notes.trim(),
        difficult_questions: difficultQuestions.trim(),
        support_needed: supportNeeded ? (supportNotes.trim() || "Yes") : "",
      });
      toast({ title: "Log saved" });
      setShowForm(false);
      resetForm();
      fetchLogs(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const resetForm = () => {
    setLogType("screening_call"); setCompanyName(""); setRoleTitle(""); setInterviewDate("");
    setRound(""); setOutcome("scheduled"); setNotes(""); setDifficultQuestions("");
    setSupportNeeded(false); setSupportNotes("");
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" /> Log Interview / Call</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Log</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Type *</Label>
                <Select value={logType} onValueChange={setLogType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Company *</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
              <div><Label>Role *</Label><Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} /></div>
              <div><Label>Date *</Label><DatePicker value={interviewDate} onChange={setInterviewDate} placeholder="MM/DD/YYYY" /></div>
              <div><Label>Round</Label><Select value={round} onValueChange={setRound}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{ROUNDS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Outcome</Label><Select value={outcome} onValueChange={setOutcome}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <div><Label>Difficult Questions</Label><Textarea value={difficultQuestions} onChange={e => setDifficultQuestions(e.target.value)} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={supportNeeded} onCheckedChange={(c) => setSupportNeeded(!!c)} /><Label>Support needed</Label>
            </div>
            {supportNeeded && <div><Label>Support Details</Label><Textarea value={supportNotes} onChange={e => setSupportNotes(e.target.value)} /></div>}
            <div className="flex gap-3">
              <Button variant="hero" onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Interview History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="px-6 pt-4 pb-2">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 mb-6 items-end">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search by Role</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    placeholder="e.g. Frontend Engineer"
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
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outcome</Label>
                <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                  <SelectTrigger className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full">
                    <SelectValue placeholder="All Outcomes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Outcomes</SelectItem>
                    {OUTCOMES.map((o) => (
                      <SelectItem key={o} value={o} className="capitalize text-xs">
                        {o.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DataTable
            data={filteredLogs}
            isLoading={loading}
            emptyMessage="No logs yet."
            columns={[
              { 
                header: "Date", 
                sortable: true,
                accessorKey: "interview_date",
                render: (l: any) => <span className="text-sm pl-6">{formatDate(l.interview_date)}</span>
              },
              { 
                header: "Type", 
                sortable: true,
                accessorKey: "interview_type",
                render: (l: any) => <span className="text-sm capitalize">{l.interview_type?.replace(/_/g, " ")}</span>
              },
              { 
                header: "Company", 
                accessorKey: "company_name",
                sortable: true,
                className: "text-sm font-medium"
              },
              { 
                header: "Role", 
                sortable: true,
                accessorKey: "role_title",
                render: (l: any) => <span className="text-sm">{l.role_title || "—"}</span>
              },
              { 
                header: "Round", 
                sortable: true,
                accessorKey: "stage_round",
                render: (l: any) => <span className="text-xs">{l.stage_round || "—"}</span>
              },
              {
                header: "Notes",
                render: (l: any) => (
                  <LongTextCell
                    title="Notes"
                    content={l.notes || l.feedback_notes}
                    companyName={l.company_name}
                    roleTitle={l.role_title}
                    onReadMore={(t, c, co, r) => setActiveLongText({ title: t, content: c, companyName: co, roleTitle: r })}
                  />
                )
              },
              {
                header: "Difficult Questions",
                render: (l: any) => (
                  <LongTextCell
                    title="Difficult Questions"
                    content={l.difficult_questions}
                    companyName={l.company_name}
                    roleTitle={l.role_title}
                    onReadMore={(t, c, co, r) => setActiveLongText({ title: t, content: c, companyName: co, roleTitle: r })}
                  />
                )
              },
              {
                header: "Support Needed",
                render: (l: any) => l.support_needed ? (
                  <LongTextCell
                    title="Support Needed"
                    content={l.support_needed}
                    companyName={l.company_name}
                    roleTitle={l.role_title}
                    onReadMore={(t, c, co, r) => setActiveLongText({ title: t, content: c, companyName: co, roleTitle: r })}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )
              },
              { 
                header: "Outcome", 
                sortable: true,
                accessorKey: "outcome",
                className: "pr-6 text-right",
                render: (l: any) => (
                  <OutcomeDropdown
                    candidateId={candidateId}
                    log={l}
                    onUpdateSuccess={() => {
                      fetchLogs(false);
                      if (onRefresh) onRefresh();
                    }}
                  />
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={!!activeLongText} onOpenChange={(open) => !open && setActiveLongText(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-2xl p-6 shadow-2xl border border-border/50">
          <DialogHeader className="border-b border-border/10 pb-4">
            <DialogTitle className="text-lg font-bold flex flex-col gap-1 text-left">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">{activeLongText?.title}</span>
              <span className="text-card-foreground">{activeLongText?.roleTitle}</span>
              <span className="text-primary text-sm font-medium">{activeLongText?.companyName}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-[55vh] overflow-y-auto pr-2">
            {activeLongText?.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterInterviewsTab;
