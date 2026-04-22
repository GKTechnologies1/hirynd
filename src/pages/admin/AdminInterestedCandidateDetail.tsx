import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { candidatesApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BACKEND_URL } from "@/services/api";
import DocumentPreview from "@/components/dashboard/DocumentPreview";

interface AdminInterestedCandidateDetailProps {
  leadId: string;
}

const AdminInterestedCandidateDetail = ({ leadId }: AdminInterestedCandidateDetailProps) => {
  const [lead, setLead] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    email: "",
    phone: "",
    university: "",
    degree: "",
    major: "",
    graduation_year: "",
    visa_status: "",
    referral_source: "",
    referral_friend_name: "",
    current_location: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadLead = async () => {
    setLoading(true);
    try {
      const { data } = await candidatesApi.interestedDetail(leadId);
      setLead(data);
      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        university: data.university || "",
        degree: data.degree || "",
        major: data.major || "",
        graduation_year: data.graduation_year || "",
        visa_status: data.visa_status || "",
        referral_source: data.referral_source || "",
        referral_friend_name: data.referral_friend_name || "",
        current_location: data.current_location || "",
        notes: data.notes || "",
      });
    } catch (err: any) {
      toast({ title: "Unable to load lead", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLead();
  }, [leadId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await candidatesApi.updateInterested(leadId, form);
      setLead(data);
      toast({ title: "Lead updated", description: "Interest details have been saved." });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <p className="text-sm text-destructive">Lead not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-3 inline-flex items-center gap-2" onClick={() => navigate('/admin-dashboard/interested-candidates')}>
            <ArrowLeft className="h-4 w-4" /> Back to Leads
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Interested Candidate Lead</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit submitted interest form details or review the lead before conversion.</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Submitted</p>
          <p className="font-semibold text-foreground">{formatDate(lead.created_at)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Name</Label>
                <Input value={form.name} onChange={(event) => handleChange('name', event.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Email</Label>
                <Input type="email" value={form.email} onChange={(event) => handleChange('email', event.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Phone</Label>
                <Input value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">University</Label>
                <Input value={form.university} onChange={(event) => handleChange('university', event.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-bold uppercase tracking-widest">Degree & Major</Label>
                <Input 
                  value={`${form.degree}${form.degree && form.major ? " & " : ""}${form.major}`} 
                  onChange={(event) => {
                    const val = event.target.value;
                    const [d, ...m] = val.split("&");
                    setForm(prev => ({ ...prev, degree: (d || "").trim(), major: m.join("&").trim() }));
                  }} 
                  className="h-11 rounded-xl" 
                  placeholder="e.g., Master's in Computer Science"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Graduation Year</Label>
                <Input value={form.graduation_year} onChange={(event) => handleChange('graduation_year', event.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Visa Status</Label>
                <Input value={form.visa_status} onChange={(event) => handleChange('visa_status', event.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Current Location</Label>
                <Input value={form.current_location} onChange={(event) => handleChange('current_location', event.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Referral Source</Label>
                <Input value={form.referral_source} onChange={(event) => handleChange('referral_source', event.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest">Friend's Name</Label>
                <Input value={form.referral_friend_name} onChange={(event) => handleChange('referral_friend_name', event.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Notes</Label>
              <Textarea value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} rows={3} className="rounded-xl" />
            </div>

            {lead.selected_services && lead.selected_services.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest">Services of Interest</Label>
                <div className="flex flex-wrap gap-2">
                  {lead.selected_services.map((s: string) => (
                    <span key={s} className="px-3 py-1 bg-secondary/10 text-secondary text-[11px] font-bold rounded-full border border-secondary/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {lead.resume_url && (
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4" /> Resume
                </div>
                <DocumentPreview url={lead.resume_file || lead.resume_url} label="View uploaded resume" className="text-sm mt-1" />
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100 sm:flex-row sm:justify-between">
              <Button variant="outline" type="button" className="h-11 rounded-xl" onClick={() => navigate('/admin-dashboard/interested-candidates')}>
                Back to Leads
              </Button>
              <Button type="submit" className="h-11 rounded-xl" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInterestedCandidateDetail;
