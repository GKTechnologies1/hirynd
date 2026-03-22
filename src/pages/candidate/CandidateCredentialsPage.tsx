import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Lock, FileText, History, Clock, User } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <span className="h-4 w-4">📋</span> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <span className="h-4 w-4">💼</span> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <span className="h-4 w-4">🔑</span> },
];

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
    full_legal_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    summary: "",
    work_experience: "",
    education: "",
    certifications: "",
    technical_skills: "",
    soft_skills: "",
    references: "",
    notes: "",
  });

  const isPaid = ["paid", "credential_completed", "active_marketing", "placed"].includes(candidate?.status);

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
      <DashboardLayout title="Credential Intake" navItems={CANDIDATE_NAV}>
        <Card>
          <CardContent className="p-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Complete your payment to access the Credential Intake Sheet.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

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
    return <DashboardLayout title="Credential Intake" navItems={CANDIDATE_NAV}><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  }

  const latestVersion = versions[0];

  return (
    <DashboardLayout title="Credential Intake Sheet" navItems={CANDIDATE_NAV}>
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
                <div><Label>Full Legal Name *</Label><Input value={formData.full_legal_name} onChange={e => handleChange("full_legal_name", e.target.value)} required /></div>
                <div><Label>Email</Label><Input type="email" value={formData.email} onChange={e => handleChange("email", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={formData.phone} onChange={e => handleChange("phone", e.target.value)} /></div>
                <div><Label>LinkedIn URL</Label><Input value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
                <div><Label>GitHub URL</Label><Input value={formData.github_url} onChange={e => handleChange("github_url", e.target.value)} placeholder="https://github.com/..." /></div>
                <div><Label>Portfolio URL</Label><Input value={formData.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} placeholder="https://..." /></div>
              </div>

              <div><Label>Professional Summary</Label><Textarea value={formData.summary} onChange={e => handleChange("summary", e.target.value)} rows={3} placeholder="Brief professional overview" /></div>
              <div><Label>Work Experience</Label><Textarea value={formData.work_experience} onChange={e => handleChange("work_experience", e.target.value)} rows={5} placeholder="List work experience..." /></div>
              <div><Label>Education</Label><Textarea value={formData.education} onChange={e => handleChange("education", e.target.value)} rows={3} /></div>
              <div><Label>Certifications</Label><Textarea value={formData.certifications} onChange={e => handleChange("certifications", e.target.value)} rows={2} /></div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Technical Skills</Label><Textarea value={formData.technical_skills} onChange={e => handleChange("technical_skills", e.target.value)} rows={3} /></div>
                <div><Label>Soft Skills</Label><Textarea value={formData.soft_skills} onChange={e => handleChange("soft_skills", e.target.value)} rows={3} /></div>
              </div>

              <div><Label>References</Label><Textarea value={formData.references} onChange={e => handleChange("references", e.target.value)} rows={3} placeholder="Name, company, email, phone" /></div>
              <div><Label>Additional Notes</Label><Textarea value={formData.notes} onChange={e => handleChange("notes", e.target.value)} rows={2} /></div>

              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : versions.length === 0 ? "Submit Credentials" : "Save New Version"}
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
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        {Object.entries(v.data as Record<string, string>).map(([key, value]) => (
                          value ? (
                            <div key={key}>
                              <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                              <span className="text-card-foreground">{value}</span>
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
    </DashboardLayout>
  );
};

export default CandidateCredentialsPage;
