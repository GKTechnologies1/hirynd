import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Lock, FileText } from "lucide-react";

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <span className="h-4 w-4">📋</span> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <span className="h-4 w-4">💼</span> },
];

interface CandidateIntakePageProps {
  candidate: any;
  onStatusChange: () => void;
}

const CandidateIntakePage = ({ candidate, onStatusChange }: CandidateIntakePageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [intake, setIntake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    university: "",
    major: "",
    degree: "",
    graduation_year: "",
    visa_status: "",
    years_experience: "",
    target_roles: "",
    target_locations: "",
    linkedin_url: "",
    portfolio_url: "",
    current_employer: "",
    skills: "",
    notes: "",
  });

  useEffect(() => {
    if (!candidate) return;
    const fetchIntake = async () => {
      const { data } = await supabase
        .from("client_intake_sheets")
        .select("*")
        .eq("candidate_id", candidate.id)
        .maybeSingle();
      if (data) {
        setIntake(data);
        if (data.data) {
          setFormData({ ...formData, ...(data.data as any) });
        }
      }
      setLoading(false);
    };
    fetchIntake();
  }, [candidate]);

  const statusAllowed = ["approved", "intake_submitted", "roles_suggested", "roles_confirmed", "paid", "credential_completed", "active_marketing", "placed"].includes(candidate?.status);
  const isLocked = intake?.is_locked === true;
  const canSubmit = candidate?.status === "approved" && !isLocked;

  if (!statusAllowed) {
    return (
      <DashboardLayout title="Intake Form" navItems={CANDIDATE_NAV}>
        <Card>
          <CardContent className="p-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Your account needs to be approved before you can access the intake form.</p>
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
    if (!canSubmit) return;
    setSubmitting(true);

    const { error } = await supabase.rpc("submit_intake_form", {
      _candidate_id: candidate.id,
      _form_data: formData,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: "Intake form submitted!", description: "Your form has been locked and submitted for review." });
    setSubmitting(false);
    onStatusChange();
  };

  if (loading) {
    return <DashboardLayout title="Intake Form" navItems={CANDIDATE_NAV}><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Client Intake Sheet" navItems={CANDIDATE_NAV}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Client Intake Sheet
            </CardTitle>
            {isLocked && (
              <div className="flex items-center gap-2 rounded-lg bg-secondary/10 px-3 py-1.5 text-sm text-secondary">
                <Lock className="h-4 w-4" /> Submitted & Locked
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Full Name *</Label><Input value={formData.full_name} onChange={e => handleChange("full_name", e.target.value)} disabled={isLocked} required /></div>
              <div><Label>Phone *</Label><Input value={formData.phone} onChange={e => handleChange("phone", e.target.value)} disabled={isLocked} required /></div>
              <div><Label>University</Label><Input value={formData.university} onChange={e => handleChange("university", e.target.value)} disabled={isLocked} /></div>
              <div><Label>Major</Label><Input value={formData.major} onChange={e => handleChange("major", e.target.value)} disabled={isLocked} /></div>
              <div>
                <Label>Degree</Label>
                <Select value={formData.degree} onValueChange={v => handleChange("degree", v)} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="Select degree" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bachelors">Bachelor's</SelectItem>
                    <SelectItem value="masters">Master's</SelectItem>
                    <SelectItem value="phd">PhD</SelectItem>
                    <SelectItem value="associate">Associate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Graduation Year</Label><Input value={formData.graduation_year} onChange={e => handleChange("graduation_year", e.target.value)} disabled={isLocked} /></div>
              <div>
                <Label>Visa Status</Label>
                <Select value={formData.visa_status} onValueChange={v => handleChange("visa_status", v)} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us_citizen">US Citizen</SelectItem>
                    <SelectItem value="green_card">Green Card</SelectItem>
                    <SelectItem value="h1b">H-1B</SelectItem>
                    <SelectItem value="opt">OPT</SelectItem>
                    <SelectItem value="cpt">CPT</SelectItem>
                    <SelectItem value="ead">EAD</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Years of Experience</Label><Input value={formData.years_experience} onChange={e => handleChange("years_experience", e.target.value)} disabled={isLocked} /></div>
            </div>

            <div><Label>Target Roles *</Label><Input value={formData.target_roles} onChange={e => handleChange("target_roles", e.target.value)} placeholder="e.g. Data Analyst, Business Analyst" disabled={isLocked} required /></div>
            <div><Label>Target Locations</Label><Input value={formData.target_locations} onChange={e => handleChange("target_locations", e.target.value)} placeholder="e.g. New York, Remote" disabled={isLocked} /></div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>LinkedIn URL</Label><Input value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} disabled={isLocked} /></div>
              <div><Label>Portfolio URL</Label><Input value={formData.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} disabled={isLocked} /></div>
              <div><Label>Current Employer</Label><Input value={formData.current_employer} onChange={e => handleChange("current_employer", e.target.value)} disabled={isLocked} /></div>
            </div>

            <div><Label>Key Skills</Label><Textarea value={formData.skills} onChange={e => handleChange("skills", e.target.value)} placeholder="List your key technical and soft skills" disabled={isLocked} /></div>
            <div><Label>Additional Notes</Label><Textarea value={formData.notes} onChange={e => handleChange("notes", e.target.value)} disabled={isLocked} /></div>

            {canSubmit && (
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit & Lock Intake Form"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CandidateIntakePage;
