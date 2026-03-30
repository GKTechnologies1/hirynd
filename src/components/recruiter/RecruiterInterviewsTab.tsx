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

import { useToast } from "@/hooks/use-toast";
import { Phone, Plus } from "lucide-react";

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

const RecruiterInterviewsTab = ({ candidateId, candidateUserId }: RecruiterInterviewsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [logType, setLogType] = useState("screening_call");
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [round, setRound] = useState("");
  const [outcome, setOutcome] = useState("Scheduled");
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
    setSaving(true);
    try {
      await candidatesApi.submitInterview(candidateId, {
        interview_type: logType,
        company_name: companyName.trim(),
        role_title: roleTitle.trim(),
        interview_date: interviewDate,
        stage_round: round,
        outcome,
        feedback_notes: notes.trim(),
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
              <div><Label>Date *</Label><Input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} /></div>
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
                render: (l: any) => <span className="text-sm pl-6">{l.interview_date ? new Date(l.interview_date).toLocaleDateString() : "—"}</span>
              },
              { 
                header: "Type", 
                render: (l: any) => <span className="text-sm capitalize">{l.log_type?.replace(/_/g, " ")}</span>
              },
              { 
                header: "Company", 
                accessorKey: "company_name",
                className: "text-sm font-medium"
              },
              { 
                header: "Role", 
                render: (l: any) => <span className="text-sm">{l.role_title || "—"}</span>
              },
              { 
                header: "Round", 
                render: (l: any) => <span className="text-xs">{l.round || "—"}</span>
              },
              { 
                header: "Outcome", 
                className: "pr-6 text-right",
                render: (l: any) => <StatusBadge status={l.outcome?.toLowerCase().replace(/ /g, "_") || "pending"} />
              }
            ]}
          />
        </CardContent>
      </Card>

    </div>
  );
};

export default RecruiterInterviewsTab;
