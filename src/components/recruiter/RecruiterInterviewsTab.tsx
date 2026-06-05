import { useState, useEffect } from "react";
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
import { Phone, Plus } from "lucide-react";
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

const RecruiterInterviewsTab = ({ candidateId, candidateUserId }: RecruiterInterviewsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeLongText, setActiveLongText] = useState<{ title: string; content: string; companyName: string; roleTitle: string } | null>(null);

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

  const fetchLogs = async () => {
    try {
      const { data } = await candidatesApi.getInterviews(candidateId);
      setLogs(data || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [candidateId]);

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
      fetchLogs();
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
          <DataTable
            data={logs}
            isLoading={loading}
            searchPlaceholder="Search company..."
            searchKey="company_name"
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
                render: (l: any) => <StatusBadge status={l.outcome?.toLowerCase().replace(/ /g, "_") || "pending"} />
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
