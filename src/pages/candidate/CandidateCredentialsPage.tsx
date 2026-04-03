import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, filesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Lock, FileText, History, Clock, User, X, LayoutDashboard, Briefcase, KeyRound, DollarSign, CreditCard, ClipboardList, Phone, UserPlus, MessageSquare, Settings } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface CandidateCredentialsPageProps {
  candidate: any;
  onStatusChange: () => void;
}

const CandidateCredentialsPage = ({ candidate, onStatusChange }: CandidateCredentialsPageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [versions, setVersions] = useState<any[]>([]);
  const [editorProfiles, setEditorProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name_as_resume: "",
    primary_resume: "",
    alternate_resume_versions: [] as string[],
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    work_history_summary: "",
    skills_summary: "",
    tools_and_technologies: "",
    certifications: "",
    visa_details: "",
    relocation_preference: "",
    references_if_needed: "",
    shared_email: "",
    gmail_password: "",
    linkedin_password: "",
    indeed_password: "",
    dice_password: "",
    foundit_password: "",
  });

  const isPaid = [
    "paid", "payment_completed", "credentials_submitted", "credential_completed", 
    "active_marketing", "placed_closed", "placed"
  ].includes(candidate?.status);

  useEffect(() => {
    if (!candidate || !isPaid) { setLoading(false); return; }
    const fetchVersions = async () => {
      try {
        const { data } = await candidatesApi.getCredentials(candidate.id);
        setVersions(data || []);
        if (data && data.length > 0 && data[0].data) {
          setFormData({ ...formData, ...(data[0].data as any) });
        }
      } catch {
        setVersions([]);
      }
      setLoading(false);
    };
    fetchVersions();
  }, [candidate]);

  if (!isPaid) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <Card>
          <CardContent className="p-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Complete your payment to access the Credential Intake Sheet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data } = await filesApi.upload(file, "credential");
      if (field === "alternate_resume_versions") {
        setFormData(prev => ({ ...prev, alternate_resume_versions: [...prev.alternate_resume_versions, data.url] }));
      } else {
        setFormData(prev => ({ ...prev, [field]: data.url }));
      }
      toast({ title: "File uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await candidatesApi.upsertCredential(candidate.id, formData);
      toast({ title: versions.length === 0 ? "Credentials submitted!" : "Credentials updated!", description: "A new version has been saved." });
      onStatusChange();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading credentials...</p></div>;
  }

  const SENSITIVE_FIELDS = ["visa_details", "references_if_needed", "gmail_password", "linkedin_password", "indeed_password", "dice_password", "foundit_password"];
  const maskSensitive = (key: string, value: string) => {
    if (SENSITIVE_FIELDS.includes(key) && value) return "******** (Sensitive Data Masked)";
    return value;
  };

  const latestVersion = versions[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="space-y-6">
        {/* Current version info */}
        {latestVersion && (
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                <History className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Version {latestVersion.version}</p>
                <p className="text-xs text-muted-foreground">
                  Last updated by {editorProfiles[latestVersion.edited_by] || "Unknown"} on{" "}
                  {new Date(latestVersion.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{versions.length} version(s)</span>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Credential Intake Sheet
            </CardTitle>
            <CardDescription>Your professional profile for marketing. Every save creates a new version.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Full Name as on Resume *</Label>
                  <Input value={formData.full_name_as_resume} onChange={e => handleChange("full_name_as_resume", e.target.value)} required />
                </div>
                <div><Label>LinkedIn URL *</Label><Input value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} required /></div>
                <div><Label>GitHub URL</Label><Input value={formData.github_url} onChange={e => handleChange("github_url", e.target.value)} /></div>
                <div><Label>Portfolio URL</Label><Input value={formData.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} /></div>
                <div><Label>Relocation Preference</Label><Input value={formData.relocation_preference} onChange={e => handleChange("relocation_preference", e.target.value)} placeholder="e.g. Open to US, Prefer East Coast" /></div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <Label>Primary Resume (PDF/DOCX) *</Label>
                  <Input type="file" onChange={e => handleFileUpload(e, "primary_resume")} accept=".pdf,.doc,.docx" required={!formData.primary_resume} />
                  {formData.primary_resume && <p className="mt-1 text-xs text-green-600">✓ Uploaded: <a href={formData.primary_resume} target="_blank" className="underline">View</a></p>}
                </div>
                <div>
                  <Label>Alternate Resume Versions</Label>
                  <Input type="file" onChange={e => handleFileUpload(e, "alternate_resume_versions")} accept=".pdf,.doc,.docx" />
                  <div className="mt-2 space-y-1">
                    {formData.alternate_resume_versions.map((url, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>v{i+1}: <a href={url} target="_blank" className="underline">Resume Link</a></span>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setFormData(prev => ({ ...prev, alternate_resume_versions: prev.alternate_resume_versions.filter((_, idx) => idx !== i) }))}><X className="h-3 w-3" /></Button>
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div><Label>Professional / Work History Summary *</Label><Textarea value={formData.work_history_summary} onChange={e => handleChange("work_history_summary", e.target.value)} rows={4} required /></div>
              <div><Label>Skills Summary *</Label><Textarea value={formData.skills_summary} onChange={e => handleChange("skills_summary", e.target.value)} rows={3} required /></div>
              <div><Label>Tools & Technologies *</Label><Textarea value={formData.tools_and_technologies} onChange={e => handleChange("tools_and_technologies", e.target.value)} rows={3} required /></div>
              <div><Label>Certifications</Label><Textarea value={formData.certifications} onChange={e => handleChange("certifications", e.target.value)} rows={2} /></div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-4 text-amber-800">
                    <KeyRound className="h-4 w-4" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Account Credentials</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Shared Email (Used for all platforms) *</Label>
                      <Input 
                        type="email"
                        value={formData.shared_email} 
                        onChange={e => handleChange("shared_email", e.target.value)} 
                        required 
                        placeholder="yourname@gmail.com"
                      />
                    </div>
                    <div>
                      <Label>Gmail Password *</Label>
                      <Input 
                        type="password" 
                        value={formData.gmail_password} 
                        onChange={e => handleChange("gmail_password", e.target.value)} 
                        required 
                      />
                    </div>
                    <div>
                      <Label>LinkedIn Password *</Label>
                      <Input 
                        type="password" 
                        value={formData.linkedin_password} 
                        onChange={e => handleChange("linkedin_password", e.target.value)} 
                        required 
                      />
                    </div>
                    <div>
                      <Label>Indeed Password (Optional)</Label>
                      <Input 
                        type="password" 
                        value={formData.indeed_password} 
                        onChange={e => handleChange("indeed_password", e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label>Dice Password (Optional)</Label>
                      <Input 
                        type="password" 
                        value={formData.dice_password} 
                        onChange={e => handleChange("dice_password", e.target.value)} 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Foundit Password (Optional)</Label>
                      <Input 
                        type="password" 
                        value={formData.foundit_password} 
                        onChange={e => handleChange("foundit_password", e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                  <Label className="text-amber-800">Visa / Immigration Details (Sensitive) *</Label>
                  <Textarea value={formData.visa_details} onChange={e => handleChange("visa_details", e.target.value)} rows={3} placeholder="Full details for internal use only" required />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                  <Label className="text-amber-800">References (Sensitive)</Label>
                  <Textarea value={formData.references_if_needed} onChange={e => handleChange("references_if_needed", e.target.value)} rows={3} placeholder="Name, Role, Company, Email, Phone" />
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full h-12" disabled={submitting}>
                {submitting ? "Saving..." : versions.length === 0 ? "Submit Marketing Credentials" : "Save New Version"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Version History */}
        {versions.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {versions.map((v: any) => (
                  <AccordionItem key={v.id} value={v.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-medium">v{v.version}</span>
                        <span className="text-sm text-muted-foreground">
                          {editorProfiles[v.edited_by] || "Unknown"} · {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 text-sm sm:grid-cols-2">
                        {Object.entries(v.data as Record<string, any>).map(([key, value]) => (
                          value ? (
                            <div key={key} className="col-span-full border-b border-border/50 pb-2 last:border-0">
                              <span className="text-muted-foreground capitalize block text-xs mb-0.5">{key.replace(/_/g, " ")}:</span>{" "}
                              <div className="text-card-foreground whitespace-pre-wrap">
                                {Array.isArray(value) 
                                  ? value.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-1.5">
                                        <span className="h-1 w-1 rounded-full bg-secondary" /> 
                                        {maskSensitive(key, String(item))}
                                      </div>
                                    ))
                                  : maskSensitive(key, String(value))}
                              </div>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CandidateCredentialsPage;
