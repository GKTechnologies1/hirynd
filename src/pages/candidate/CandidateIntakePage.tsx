import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, filesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Lock, FileText } from "lucide-react";

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

  // Form fields as per Section 5.3
  const [formData, setFormData] = useState({
    // Section A - Personal Details
    first_name: "",
    last_name: "",
    date_of_birth: "",
    phone_number: "",
    alternate_phone: "",
    email: user?.email || "",
    current_address: "",
    city: "",
    state: "",
    country: "",
    zip_code: "",
    // Section B - Education
    university_name: "",
    degree: "",
    major: "",
    graduation_date: "",
    additional_certifications: "",
    academic_projects: "",
    // Section C - Work Authorization
    visa_type: "",
    visa_expiry_date: "",
    work_authorization_status: "",
    sponsorship_required: false,
    country_of_work_authorization: "",
    // Section D - Job Preferences
    target_roles: "", // Will treat as comma-separated or multi-text
    preferred_locations: "",
    remote_preference: "",
    salary_expectation: "",
    relocation_preference: false,
    industry_preference: "",
    shift_preference: "",
    // Section E - Professional Background
    years_of_experience: "",
    recent_employer: "",
    current_job_title: "",
    technologies_or_skills: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    resume_url: "",
    // Section F - Marketing Inputs
    ready_to_start_date: "",
    preferred_employment_type: "",
    job_search_priority: "",
    additional_notes: "",
  });

  useEffect(() => {
    if (!candidate) return;
    const fetchIntake = async () => {
      try {
        const { data } = await candidatesApi.getIntake(candidate.id);
        if (data && data.id) {
          setIntake(data);
          const saved = data.data || {};
          
          // Map backend simplified keys to frontend detailed keys
          const mappedData: any = { ...saved };
          
          if (saved.full_name && !saved.first_name) {
            const parts = saved.full_name.split(" ");
            mappedData.first_name = parts[0] || "";
            mappedData.last_name = parts.slice(1).join(" ") || "";
          }
          if (saved.phone && !saved.phone_number) mappedData.phone_number = saved.phone;
          if (saved.university && !saved.university_name) mappedData.university_name = saved.university;
          if (saved.graduation_year && !saved.graduation_date) mappedData.graduation_date = saved.graduation_year;
          if (saved.visa_status && !saved.visa_type) mappedData.visa_type = saved.visa_status;
          if (saved.years_experience && !saved.years_of_experience) mappedData.years_of_experience = saved.years_experience;
          if (saved.target_locations && !saved.preferred_locations) mappedData.preferred_locations = saved.target_locations;
          if (saved.current_employer && !saved.recent_employer) mappedData.recent_employer = saved.current_employer;
          if (saved.skills && !saved.technologies_or_skills) mappedData.technologies_or_skills = saved.skills;
          if (saved.notes && !saved.additional_notes) mappedData.additional_notes = saved.notes;

          setFormData(prev => ({ 
            ...prev, 
            ...mappedData,
            email: saved.email || user?.email || prev.email // Keep existing or user email
          }));
        }
      } catch (err) {
        console.error("No intake found or fetch error:", err);
      }
      setLoading(false);
    };
    fetchIntake();
  }, [candidate?.id, user?.email]);

  const statusAllowed = [
    "approved", "intake_submitted", "roles_published", "roles_suggested", "roles_confirmed", 
    "payment_completed", "paid", "credentials_submitted", "credential_completed", 
    "active_marketing", "placed_closed", "placed", "on_hold", "paused", "past_due"
  ].includes(candidate?.status);
  const isLocked = intake?.is_locked === true;
  const canSubmit = (["approved", "lead", "on_boarding", "roles_published"].includes(candidate?.status) || (candidate?.status === "intake_submitted" && !isLocked)) && !isLocked;

  if (!statusAllowed) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Your account needs to be approved before you can access the intake form.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      await candidatesApi.submitIntake(candidate.id, formData);
      toast({ title: "Intake form submitted!", description: "Your form has been locked and submitted for review." });
      onStatusChange();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data } = await filesApi.upload(file, "resume");
      handleChange("resume_url", data.url);
      toast({ title: "Resume uploaded!", description: "File successfully attached." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading intake form...</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section A - Personal Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Section A – Personal Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>First Name *</Label><Input value={formData.first_name} onChange={e => handleChange("first_name", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>Last Name *</Label><Input value={formData.last_name} onChange={e => handleChange("last_name", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>Date of Birth *</Label><Input type="date" value={formData.date_of_birth} onChange={e => handleChange("date_of_birth", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>Phone Number *</Label><Input type="tel" value={formData.phone_number} onChange={e => handleChange("phone_number", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>Alternate Phone</Label><Input type="tel" value={formData.alternate_phone} onChange={e => handleChange("alternate_phone", e.target.value)} disabled={isLocked} /></div>
                <div><Label>Email *</Label><Input type="email" value={formData.email} onChange={e => handleChange("email", e.target.value)} disabled required /></div>
                <div className="sm:col-span-2"><Label>Current Address *</Label><Input value={formData.current_address} onChange={e => handleChange("current_address", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>City *</Label><Input value={formData.city} onChange={e => handleChange("city", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>State *</Label><Input value={formData.state} onChange={e => handleChange("state", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>Country *</Label><Input value={formData.country} onChange={e => handleChange("country", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>Zip Code *</Label><Input value={formData.zip_code} onChange={e => handleChange("zip_code", e.target.value)} disabled={isLocked} required /></div>
              </div>
            </div>

            {/* Section B - Education */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Section B – Education</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>University Name *</Label><Input value={formData.university_name} onChange={e => handleChange("university_name", e.target.value)} disabled={isLocked} required /></div>
                <div>
                  <Label>Degree *</Label>
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
                <div><Label>Major *</Label><Input value={formData.major} onChange={e => handleChange("major", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>Graduation Date *</Label><Input type="date" value={formData.graduation_date} onChange={e => handleChange("graduation_date", e.target.value)} disabled={isLocked} required /></div>
                <div className="sm:col-span-2"><Label>Additional Certifications</Label><Textarea value={formData.additional_certifications} onChange={e => handleChange("additional_certifications", e.target.value)} disabled={isLocked} /></div>
                <div className="sm:col-span-2"><Label>Academic Projects</Label><Textarea value={formData.academic_projects} onChange={e => handleChange("academic_projects", e.target.value)} disabled={isLocked} /></div>
              </div>
            </div>

            {/* Section C - Work Authorization */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Section C – Work Authorization</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Visa Type *</Label>
                  <Select value={formData.visa_type} onValueChange={v => handleChange("visa_type", v)} disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="H1B">H1B</SelectItem>
                      <SelectItem value="OPT">OPT</SelectItem>
                      <SelectItem value="CPT">CPT</SelectItem>
                      <SelectItem value="Green Card">Green Card</SelectItem>
                      <SelectItem value="US Citizen">US Citizen</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Visa Expiry Date</Label><Input type="date" value={formData.visa_expiry_date} onChange={e => handleChange("visa_expiry_date", e.target.value)} disabled={isLocked} /></div>
                <div>
                  <Label>Work Authorization Status *</Label>
                  <Select value={formData.work_authorization_status} onValueChange={v => handleChange("work_authorization_status", v)} disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Authorized">Authorized</SelectItem>
                      <SelectItem value="Requires Sponsorship">Requires Sponsorship</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sponsorship Required? *</Label>
                  <div className="flex items-center gap-4 py-2">
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.sponsorship_required === true} onChange={() => handleChange("sponsorship_required", true as any)} disabled={isLocked} /> Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.sponsorship_required === false} onChange={() => handleChange("sponsorship_required", false as any)} disabled={isLocked} /> No</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section D - Job Preferences */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Section D – Job Preferences</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Target Roles *</Label><Input value={formData.target_roles} onChange={e => handleChange("target_roles", e.target.value)} placeholder="e.g. Software Engineer, Data Scientist" disabled={isLocked} required /></div>
                <div className="sm:col-span-2"><Label>Preferred Locations *</Label><Input value={formData.preferred_locations} onChange={e => handleChange("preferred_locations", e.target.value)} placeholder="e.g. New York, Remote" disabled={isLocked} required /></div>
                <div>
                  <Label>Remote Preference *</Label>
                  <Select value={formData.remote_preference} onValueChange={v => handleChange("remote_preference", v)} disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Select preference" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="On-site">On-site</SelectItem>
                      <SelectItem value="Any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Salary Expectation (USD) *</Label><Input type="number" value={formData.salary_expectation} onChange={e => handleChange("salary_expectation", e.target.value)} disabled={isLocked} required /></div>
                <div>
                  <Label>Willing to Relocate? *</Label>
                  <div className="flex items-center gap-4 py-2">
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.relocation_preference === true} onChange={() => handleChange("relocation_preference", true as any)} disabled={isLocked} /> Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={formData.relocation_preference === false} onChange={() => handleChange("relocation_preference", false as any)} disabled={isLocked} /> No</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section E - Professional Background */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Section E – Professional Background</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Years of Experience *</Label><Input type="number" value={formData.years_of_experience} onChange={e => handleChange("years_of_experience", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>Recent Employer</Label><Input value={formData.recent_employer} onChange={e => handleChange("recent_employer", e.target.value)} disabled={isLocked} /></div>
                <div><Label>Current Job Title</Label><Input value={formData.current_job_title} onChange={e => handleChange("current_job_title", e.target.value)} disabled={isLocked} /></div>
                <div><Label>LinkedIn URL *</Label><Input type="url" value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} disabled={isLocked} required /></div>
                <div><Label>GitHub URL</Label><Input type="url" value={formData.github_url} onChange={e => handleChange("github_url", e.target.value)} disabled={isLocked} /></div>
                <div><Label>Portfolio URL</Label><Input type="url" value={formData.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} disabled={isLocked} /></div>
                <div className="sm:col-span-2"><Label>Technologies or Skills *</Label><Textarea value={formData.technologies_or_skills} onChange={e => handleChange("technologies_or_skills", e.target.value)} disabled={isLocked} required /></div>
                <div className="sm:col-span-2">
                  <Label>Resume Upload (PDF/DOCX) *</Label>
                  <Input type="file" onChange={handleFileUpload} disabled={isLocked} accept=".pdf,.doc,.docx" required={!formData.resume_url} />
                  {formData.resume_url && <p className="mt-1 text-xs text-green-600 font-medium">✓ File uploaded: <a href={formData.resume_url} target="_blank" className="underline">View Resume</a></p>}
                </div>
              </div>
            </div>

            {/* Section F - Marketing Inputs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Section F – Marketing Inputs</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Ready to Start Date *</Label><Input type="date" value={formData.ready_to_start_date} onChange={e => handleChange("ready_to_start_date", e.target.value)} disabled={isLocked} required /></div>
                <div>
                  <Label>Preferred Employment Type *</Label>
                  <Select value={formData.preferred_employment_type} onValueChange={v => handleChange("preferred_employment_type", v)} disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="C2C">C2C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><Label>Additional Notes</Label><Textarea value={formData.additional_notes} onChange={e => handleChange("additional_notes", e.target.value)} disabled={isLocked} /></div>
              </div>
            </div>

            {canSubmit && (
              <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit & Lock Intake Form"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateIntakePage;
