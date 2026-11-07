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
import {
  Phone, Plus, ChevronDown, Briefcase, X, Search, Calendar,
  Download, Pencil, Clock, CheckCircle, ExternalLink, Loader2
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { format, subDays, parse } from "date-fns";

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
  candidate?: any;
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

export const RecruiterInterviewsTab = ({ candidateId, candidateUserId, candidate, onRefresh }: RecruiterInterviewsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeLongText, setActiveLongText] = useState<{ title: string; content: string; companyName: string; roleTitle: string } | null>(null);

  // Filters
  const [searchRole, setSearchRole] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  // Edit Interview Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    interview_type: "screening_call",
    company_name: "",
    role_title: "",
    interview_date: "",
    stage_round: "",
    outcome: "scheduled",
    meeting_link: "",
    interviewer_name: "",
    notes: "",
    difficult_questions: "",
    support_needed: false,
    support_notes: "",
  });

  // Download Dialog State
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadFromDate, setDownloadFromDate] = useState(() => format(subDays(new Date(), 30), "MM-dd-yyyy"));
  const [downloadToDate, setDownloadToDate] = useState(() => format(new Date(), "MM-dd-yyyy"));
  const [downloadOutcomeFilter, setDownloadOutcomeFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchRole = !searchRole || l.role_title?.toLowerCase().includes(searchRole.toLowerCase());
      const matchCompany = !searchCompany || l.company_name?.toLowerCase().includes(searchCompany.toLowerCase());
      
      let matchDate = true;
      if (l.interview_date) {
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

  // Interviews eligible for download based on modal filters
  const interviewsToDownload = useMemo(() => {
    return logs.filter(l => {
      let matchDate = true;
      if (l.interview_date) {
        const [y, m, d] = l.interview_date.split("-").map((s: string) => parseInt(s, 10));
        const itemDate = new Date(y, m - 1, d);
        itemDate.setHours(0, 0, 0, 0);

        if (downloadFromDate) {
          const fParts = downloadFromDate.split(/[-\/]/);
          if (fParts.length === 3) {
            const fd = new Date(parseInt(fParts[2], 10), parseInt(fParts[0], 10) - 1, parseInt(fParts[1], 10));
            fd.setHours(0, 0, 0, 0);
            if (itemDate < fd) matchDate = false;
          }
        }
        
        if (downloadToDate) {
          const tParts = downloadToDate.split(/[-\/]/);
          if (tParts.length === 3) {
            const td = new Date(parseInt(tParts[2], 10), parseInt(tParts[0], 10) - 1, parseInt(tParts[1], 10));
            td.setHours(23, 59, 59, 999);
            if (itemDate > td) matchDate = false;
          }
        }
      } else {
        if (downloadFromDate || downloadToDate) matchDate = false;
      }

      const matchOutcome = downloadOutcomeFilter === "all" || l.outcome?.toLowerCase() === downloadOutcomeFilter.toLowerCase();

      return matchDate && matchOutcome;
    });
  }, [logs, downloadFromDate, downloadToDate, downloadOutcomeFilter]);

  // Create form state
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

  // Convert MM-DD-YYYY → YYYY-MM-DD
  const toISODate = (d: string) => {
    if (!d) return d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parts = d.split(/[-\/]/);
    if (parts.length === 3 && parts[0].length === 2) return `${parts[2]}-${parts[0]}-${parts[1]}`;
    return d;
  };

  // Convert YYYY-MM-DD → MM-DD-YYYY
  const toDisplayDate = (d: string) => {
    if (!d) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
      const clean = d.split("T")[0];
      const [y, m, day] = clean.split("-");
      return `${m}-${day}-${y}`;
    }
    return d;
  };

  const handleSubmit = async () => {
    if (!companyName.trim() || !roleTitle.trim() || !interviewDate) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }

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
      toast({ title: "Interview logged successfully" });
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

  // Open Edit Dialog
  const handleOpenEdit = (l: any) => {
    setEditingLog(l);
    setEditForm({
      interview_type: l.interview_type || "screening_call",
      company_name: l.company_name || "",
      role_title: l.role_title || "",
      interview_date: toDisplayDate(l.interview_date),
      stage_round: l.stage_round || "",
      outcome: l.outcome || "scheduled",
      meeting_link: l.meeting_link || "",
      interviewer_name: l.interviewer_name || "",
      notes: l.notes || l.feedback_notes || "",
      difficult_questions: l.difficult_questions || "",
      support_needed: !!l.support_needed,
      support_notes: l.support_needed === "Yes" ? "" : (l.support_needed || ""),
    });
    setEditDialogOpen(true);
  };

  // Submit Edit
  const handleSaveEdit = async () => {
    if (!editingLog) return;
    if (!editForm.company_name.trim() || !editForm.role_title.trim() || !editForm.interview_date) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      const payload: any = {
        interview_type: editForm.interview_type,
        company_name: editForm.company_name.trim(),
        role_title: editForm.role_title.trim(),
        interview_date: toISODate(editForm.interview_date),
        stage_round: editForm.stage_round || "",
        outcome: editForm.outcome,
        meeting_link: editForm.meeting_link.trim() || null,
        interviewer_name: editForm.interviewer_name.trim() || null,
        notes: editForm.notes.trim(),
        feedback_notes: editForm.notes.trim(),
        difficult_questions: editForm.difficult_questions.trim(),
        support_needed: editForm.support_needed ? (editForm.support_notes.trim() || "Yes") : "",
      };

      await candidatesApi.updateInterview(candidateId, editingLog.id, payload);

      // Update state locally immediately
      setLogs(prev => prev.map(l => l.id === editingLog.id ? { ...l, ...payload } : l));

      toast({
        title: "Interview Updated",
        description: `Successfully updated interview details for ${editForm.company_name}.`
      });

      setEditDialogOpen(false);
      setEditingLog(null);
      fetchLogs(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive"
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const candidateName = candidate?.full_name || candidate?.profile?.full_name || "Candidate";
    const displayId = candidate?.display_id || (candidateId ? `HYRCDT${candidateId.slice(-6).toUpperCase()}` : "");

    const headers = [
      "Interview ID",
      "Candidate ID",
      "Candidate Name",
      "Interview Date",
      "Interview Type",
      "Company Name",
      "Role Title",
      "Stage / Round",
      "Outcome",
      "Interviewer Name",
      "Meeting Link",
      "Notes & Feedback",
      "Difficult Questions",
      "Support Needed",
      "Logged Date & Time",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = interviewsToDownload.map((l: any) => {
      const interviewId = `HYRINT${l.id ? l.id.toString().slice(-6).toUpperCase() : ""}`;
      const typeLabel = LOG_TYPES.find(t => t.value === l.interview_type)?.label || l.interview_type?.replace(/_/g, " ") || "";
      const outcomeLabel = (l.outcome || "").replace(/_/g, " ");
      const loggedAt = l.created_at ? format(new Date(l.created_at), "MM-dd-yyyy hh:mm a") : "";

      return [
        escapeCsv(interviewId),
        escapeCsv(displayId),
        escapeCsv(candidateName),
        escapeCsv(l.interview_date || ""),
        escapeCsv(typeLabel),
        escapeCsv(l.company_name || ""),
        escapeCsv(l.role_title || ""),
        escapeCsv(l.stage_round || ""),
        escapeCsv(outcomeLabel),
        escapeCsv(l.interviewer_name || ""),
        escapeCsv(l.meeting_link || ""),
        escapeCsv(l.notes || l.feedback_notes || ""),
        escapeCsv(l.difficult_questions || ""),
        escapeCsv(l.support_needed || ""),
        escapeCsv(loggedAt),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanCandName = candidateName.replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `${cleanCandName}_Interviews_${format(new Date(), "MM-dd-yyyy")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: `Successfully exported ${interviewsToDownload.length} candidate interviews in CSV format.`,
    });
    setDownloadDialogOpen(false);
  };

  if (loading) return <p className="text-muted-foreground p-8 text-center text-sm font-medium">Loading interviews...</p>;

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Log Interview / Call
        </Button>
      </div>

      {/* New Interview Log Form */}
      {showForm && (
        <Card className="border-none shadow-sm bg-card/60">
          <CardHeader><CardTitle className="text-base font-bold">New Interview Log</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Type *</Label>
                <Select value={logType} onValueChange={setLogType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Company *</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
              <div><Label>Role *</Label><Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} /></div>
              <div><Label>Date *</Label><DatePicker value={interviewDate} onChange={setInterviewDate} placeholder="MM/DD/YYYY" /></div>
              <div>
                <Label>Round</Label>
                <Select value={round} onValueChange={setRound}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{ROUNDS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OUTCOMES.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <div><Label>Difficult Questions</Label><Textarea value={difficultQuestions} onChange={e => setDifficultQuestions(e.target.value)} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={supportNeeded} onCheckedChange={(c) => setSupportNeeded(!!c)} /><Label>Support needed</Label>
            </div>
            {supportNeeded && <div><Label>Support Details</Label><Textarea value={supportNotes} onChange={e => setSupportNotes(e.target.value)} /></div>}
            <div className="flex gap-3">
              <Button variant="hero" onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save Log"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Interviews History Card */}
      <Card className="border-none shadow-sm bg-card/60">
        <CardHeader className="pb-3 px-6 pt-5 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Phone className="h-4 w-4 text-primary" /> Interview History
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track and export scheduled and completed interviews for this candidate
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                if (fromDate) setDownloadFromDate(fromDate);
                if (toDate) setDownloadToDate(toDate);
                setDownloadDialogOpen(true);
              }}
              className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer w-fit"
            >
              <Download className="h-4 w-4" />
              Download Interviews
            </Button>
          </div>
        </CardHeader>

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
            emptyMessage="No interview logs recorded yet."
            columns={[
              { 
                header: "Date", 
                sortable: true,
                accessorKey: "interview_date",
                render: (l: any) => <span className="text-sm pl-6 font-medium whitespace-nowrap">{formatDate(l.interview_date)}</span>
              },
              { 
                header: "Type", 
                sortable: true,
                accessorKey: "interview_type",
                render: (l: any) => <span className="text-sm capitalize font-medium">{l.interview_type?.replace(/_/g, " ")}</span>
              },
              { 
                header: "Company", 
                accessorKey: "company_name",
                sortable: true,
                className: "text-sm font-bold"
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
                render: (l: any) => (
                  l.stage_round ? (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap">
                      {l.stage_round}
                    </span>
                  ) : <span className="text-muted-foreground text-xs">—</span>
                )
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
                className: "text-center whitespace-nowrap",
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
              },
              {
                header: "Actions",
                className: "px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-background shadow-xs",
                render: (l: any) => (
                  <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleOpenEdit(l);
                      }}
                      className="h-7 px-2.5 text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/80 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                      title="Edit interview details"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Read More Dialog */}
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

      {/* Edit Interview Dialog (same as Application edit) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-background rounded-2xl border border-border shadow-2xl">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Interview Log
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update interview schedule, outcome, questions, and feedback notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Company Name *</Label>
                <Input
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  placeholder="e.g. Google"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Role Title *</Label>
                <Input
                  value={editForm.role_title}
                  onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Interview Type *</Label>
                <Select
                  value={editForm.interview_type}
                  onValueChange={(v) => setEditForm({ ...editForm, interview_type: v })}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOG_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Interview Date *</Label>
                <DatePicker
                  value={editForm.interview_date}
                  onChange={(d) => setEditForm({ ...editForm, interview_date: d })}
                  placeholder="MM-DD-YYYY"
                  formatStr="MM-dd-yyyy"
                  className="h-9 text-xs w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Round / Stage</Label>
                <Select
                  value={editForm.stage_round || "__NONE__"}
                  onValueChange={(v) => setEditForm({ ...editForm, stage_round: v === "__NONE__" ? "" : v })}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__" className="text-xs text-muted-foreground">-- None --</SelectItem>
                    {ROUNDS.map(r => (
                      <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Outcome</Label>
                <Select
                  value={editForm.outcome}
                  onValueChange={(v) => setEditForm({ ...editForm, outcome: v })}
                >
                  <SelectTrigger className="h-9 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTCOMES.map(o => (
                      <SelectItem key={o} value={o} className="capitalize text-xs">
                        {o.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Interviewer Name</Label>
                <Input
                  value={editForm.interviewer_name}
                  onChange={(e) => setEditForm({ ...editForm, interviewer_name: e.target.value })}
                  placeholder="e.g. John Doe (Hiring Manager)"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Meeting Link (Zoom / Teams / Meet)</Label>
              <Input
                value={editForm.meeting_link}
                onChange={(e) => setEditForm({ ...editForm, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Notes & Feedback</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Enter feedback and key takeaways from the call..."
                className="text-xs min-h-[70px] resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Difficult Questions Asked</Label>
              <Textarea
                value={editForm.difficult_questions}
                onChange={(e) => setEditForm({ ...editForm, difficult_questions: e.target.value })}
                placeholder="Any technical or behavioral questions that challenged the candidate..."
                className="text-xs min-h-[60px] resize-y"
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-border/40">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editForm.support_needed}
                  onCheckedChange={(c) => setEditForm({ ...editForm, support_needed: !!c })}
                />
                <Label className="text-xs font-bold cursor-pointer">Support needed for next round</Label>
              </div>
              {editForm.support_needed && (
                <div className="space-y-1">
                  <Textarea
                    value={editForm.support_notes}
                    onChange={(e) => setEditForm({ ...editForm, support_notes: e.target.value })}
                    placeholder="Details about proxy, mock interview, or technical prep support needed..."
                    className="text-xs min-h-[60px] resize-y"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(false)}
              disabled={savingEdit}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Candidate Interviews Modal (CSV Export) */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">
          <DialogHeader className="space-y-1 pb-2 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <Download className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Download Candidate Interviews
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Export scheduled and completed interview logs in clean CSV format.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            {/* Candidate Info Pill */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Candidate:</span>
              <span className="font-bold text-foreground">
                {candidate?.full_name || candidate?.profile?.full_name || "Candidate"}
                <span className="ml-1.5 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {candidate?.display_id || (candidateId ? `HYRCDT${candidateId.slice(-6).toUpperCase()}` : "")}
                </span>
              </span>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 rounded-lg"
                  onClick={() => {
                    setDownloadFromDate("");
                    setDownloadToDate("");
                    setDownloadOutcomeFilter("all");
                  }}
                >
                  All Time
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 rounded-lg"
                  onClick={() => {
                    const todayStr = format(new Date(), "MM-dd-yyyy");
                    setDownloadFromDate(todayStr);
                    setDownloadToDate(todayStr);
                  }}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 rounded-lg"
                  onClick={() => {
                    const weekAgoStr = format(subDays(new Date(), 7), "MM-dd-yyyy");
                    const todayStr = format(new Date(), "MM-dd-yyyy");
                    setDownloadFromDate(weekAgoStr);
                    setDownloadToDate(todayStr);
                  }}
                >
                  Last 7 Days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 rounded-lg"
                  onClick={() => {
                    const monthAgoStr = format(subDays(new Date(), 30), "MM-dd-yyyy");
                    const todayStr = format(new Date(), "MM-dd-yyyy");
                    setDownloadFromDate(monthAgoStr);
                    setDownloadToDate(todayStr);
                  }}
                >
                  Last 30 Days
                </Button>
              </div>
            </div>

            {/* Date Range & Outcome Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">From Date</Label>
                <DatePicker
                  value={downloadFromDate}
                  onChange={setDownloadFromDate}
                  placeholder="MM-DD-YYYY"
                  formatStr="MM-dd-yyyy"
                  className="h-9 text-xs w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">To Date</Label>
                <DatePicker
                  value={downloadToDate}
                  onChange={setDownloadToDate}
                  placeholder="MM-DD-YYYY"
                  formatStr="MM-dd-yyyy"
                  className="h-9 text-xs w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Outcome Filter</Label>
                <Select value={downloadOutcomeFilter} onValueChange={setDownloadOutcomeFilter}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Outcomes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Outcomes</SelectItem>
                    {OUTCOMES.map(o => (
                      <SelectItem key={o} value={o} className="capitalize text-xs">
                        {o.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Export Summary Box */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Interviews to Export:</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {interviewsToDownload.length} {interviewsToDownload.length === 1 ? "interview" : "interviews"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Export will generate a UTF-8 encoded CSV file ready for Excel and Google Sheets.
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center gap-2 border-t pt-3 mt-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDownloadDialogOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExportCsv}
              disabled={interviewsToDownload.length === 0}
              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV ({interviewsToDownload.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterInterviewsTab;
