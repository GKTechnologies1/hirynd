import { useState, useEffect } from "react";
import { candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Award, CheckCircle } from "lucide-react";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import { formatDate } from "@/lib/utils";
import { DatePicker } from "@/components/ui/DatePicker";
import { parse, format } from "date-fns";

interface AdminPlacementTabProps {
  candidateId: string;
  candidateStatus: string;
  onRefresh: () => void;
}

const AdminPlacementTab = ({ candidateId, candidateStatus, onRefresh }: AdminPlacementTabProps) => {
  const { toast } = useToast();
  const [placement, setPlacement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    role_title: "",
    start_date: "",
    salary: "",
    hr_email: "",
    offer_letter_url: "",
    interviewer_email: "",
    bgv_company_name: "",
    notes: "",
  });

  useEffect(() => {
    candidatesApi.getPlacement(candidateId)
      .then(({ data }) => { 
        setPlacement(data && Object.keys(data).length > 0 ? data : null); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, [candidateId]);


  const handleSubmit = async () => {
    if (!form.company_name.trim() || !form.role_title.trim() || !form.start_date || !form.salary.trim() || !form.hr_email.trim()) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      let startDate = form.start_date;
      if (startDate && startDate.includes("-")) {
        const parts = startDate.split("-");
        if (parts[0].length === 2 && parts[2].length === 4) {
          try {
            const parsed = parse(startDate, "MM-dd-yyyy", new Date());
            if (!isNaN(parsed.getTime())) startDate = format(parsed, "yyyy-MM-dd");
          } catch(e) {}
        }
      }

      await candidatesApi.closePlacement(candidateId, {
        company_name: form.company_name.trim(),
        role_title: form.role_title.trim(),
        start_date: startDate,
        salary: form.salary.trim(),
        hr_email: form.hr_email.trim(),
        offer_letter_url: form.offer_letter_url,
        interviewer_email: form.interviewer_email,
        bgv_company_name: form.bgv_company_name,
        notes: form.notes,
      });
      toast({ title: "Case closed successfully!" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  if (placement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-secondary" /> Placement Closed</CardTitle>
          <CardDescription>This candidate has been successfully placed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Company:</span> <strong>{placement.company_name}</strong></div>
          <div><span className="text-muted-foreground">Role:</span> <strong>{placement.role_title}</strong></div>
          <div><span className="text-muted-foreground mr-1">Start Date:</span> {formatDate(placement.start_date)}</div>
          <div><span className="text-muted-foreground">Salary:</span> {placement.salary}</div>
          <div><span className="text-muted-foreground">HR Email:</span> {placement.hr_email}</div>
          {placement.interviewer_email && <div><span className="text-muted-foreground">Interviewer:</span> {placement.interviewer_email}</div>}
          {placement.bgv_company_name && <div><span className="text-muted-foreground">BGV Company:</span> {placement.bgv_company_name}</div>}
          {placement.offer_letter_url && (
            <div><span className="text-muted-foreground">Offer Letter:</span>{" "}
              <DocumentPreview url={placement.offer_letter_url} label="View" className="text-primary underline" />
            </div>
          )}
          {placement.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Notes:</span> {placement.notes}</div>}
          <div className="sm:col-span-2 text-xs text-muted-foreground">Closed on {new Date(placement.created_at).toLocaleString()}</div>
        </CardContent>
      </Card>
    );
  }

  if (!showForm) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <Award className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">No placement closure yet.</p>
          <Button variant="hero" onClick={() => setShowForm(true)}>
            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Placed / Close Case
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Case Closure Form</CardTitle>
        <CardDescription>Fill in placement details to close this candidate's case.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
          <div><Label>Role Title *</Label><Input value={form.role_title} onChange={e => setForm(p => ({ ...p, role_title: e.target.value }))} /></div>
          <div><Label>Start Date *</Label>
            <DatePicker 
              value={form.start_date} 
              onChange={val => setForm(p => ({ ...p, start_date: val }))} 
            />
          </div>
          <div><Label>Salary *</Label><Input value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} placeholder="e.g. $85,000/year" /></div>
          <div><Label>HR Email *</Label><Input type="email" value={form.hr_email} onChange={e => setForm(p => ({ ...p, hr_email: e.target.value }))} /></div>
          <div><Label>Offer Letter URL</Label><Input value={form.offer_letter_url} onChange={e => setForm(p => ({ ...p, offer_letter_url: e.target.value }))} placeholder="https://..." /></div>
          <div><Label>Interviewer Email</Label><Input type="email" value={form.interviewer_email} onChange={e => setForm(p => ({ ...p, interviewer_email: e.target.value }))} /></div>
          <div><Label>BGV Company</Label><Input value={form.bgv_company_name} onChange={e => setForm(p => ({ ...p, bgv_company_name: e.target.value }))} /></div>
        </div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
        <div className="flex gap-3">
          <Button variant="hero" onClick={handleSubmit} disabled={submitting}>{submitting ? "Closing..." : "Close Case & Mark Placed"}</Button>
          <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPlacementTab;
