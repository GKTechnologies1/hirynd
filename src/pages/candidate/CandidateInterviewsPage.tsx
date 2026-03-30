import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { useToast } from "@/hooks/use-toast";

import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, ClipboardList, UserPlus, Phone, Plus, Calendar } from "lucide-react";

const navItems = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Phone className="h-4 w-4" /> },
  { label: "Refer a Friend", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
];

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

interface CandidateInterviewsPageProps {
  candidate: any;
}

const CandidateInterviewsPage = ({ candidate }: CandidateInterviewsPageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
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
    if (!candidate?.id) return;
    try {
      const { data } = await candidatesApi.getInterviews(candidate.id);
      setLogs(data || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [candidate?.id]);

  const handleSubmit = async () => {
    if (!companyName.trim() || !roleTitle.trim() || !interviewDate) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await candidatesApi.submitInterview(candidate.id, {
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
      toast({ title: "Interview log saved" });
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

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const scheduledThisWeek = logs.filter(l => l.outcome === "scheduled" && l.interview_date >= weekAgo).length;
  const completed = logs.filter(l => l.outcome === "completed").length;
  const offers = logs.filter(l => l.outcome === "selected").length;

  return (
    <DashboardLayout title="Interviews & Calls" navItems={navItems}>
      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Scheduled This Week", value: scheduledThisWeek },
              { label: "Completed", value: completed },
              { label: "Offers", value: offers },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-card-foreground">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Button */}
          <div className="flex justify-end">
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-1 h-4 w-4" /> Log Interview / Call
            </Button>
          </div>

          {/* Form */}
          {showForm && (
            <Card>
              <CardHeader><CardTitle>New Interview / Call Log</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Type *</Label>
                    <Select value={logType} onValueChange={setLogType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LOG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Company Name *</Label>
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Role Title *</Label>
                    <Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Round</Label>
                    <Select value={round} onValueChange={setRound}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {ROUNDS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="General notes about the call/interview" />
                </div>
                <div>
                  <Label>Difficult Questions</Label>
                  <Textarea value={difficultQuestions} onChange={e => setDifficultQuestions(e.target.value)} placeholder="Any difficult questions asked?" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={supportNeeded} onCheckedChange={(checked) => setSupportNeeded(!!checked)} />
                  <Label>Support needed from team</Label>
                </div>
                {supportNeeded && (
                  <div>
                    <Label>Support Details</Label>
                    <Textarea value={supportNotes} onChange={e => setSupportNotes(e.target.value)} placeholder="What support do you need?" />
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="hero" onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save Log"}</Button>
                  <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* History Table */}
          <Card>
            <CardHeader><CardTitle>Interview History</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                data={logs}
                isLoading={loading}
                searchPlaceholder="Search by company..."
                searchKey="company_name"
                emptyMessage="No interviews or calls logged yet."
                columns={[
                  { 
                    header: "Date", 
                    render: (l: any) => <span className="text-sm">{l.interview_date ? new Date(l.interview_date).toLocaleDateString() : "—"}</span>
                  },
                  { 
                    header: "Type", 
                    render: (l: any) => <span className="text-sm capitalize">{l.interview_type?.replace(/_/g, " ")}</span>
                  },
                  { 
                    header: "Company", 
                    accessorKey: "company_name",
                    className: "font-medium text-sm"
                  },
                  { 
                    header: "Role", 
                    accessorKey: "role_title",
                    className: "text-sm"
                  },
                  { 
                    header: "Round", 
                    accessorKey: "stage_round",
                    className: "text-sm"
                  },
                  { 
                    header: "Outcome", 
                    render: (l: any) => <StatusBadge status={l.outcome?.toLowerCase().replace(/ /g, "_") || "pending"} />
                  }
                ]}
              />
            </CardContent>
          </Card>

        </div>
      )}
    </DashboardLayout>
  );
};

export default CandidateInterviewsPage;
