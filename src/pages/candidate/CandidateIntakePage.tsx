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
import { Badge } from "@/components/ui/badge";
import {
  Lock, FileText, Calendar as CalendarIcon, CheckCircle,
  User, Award, Shield, LayoutDashboard, Briefcase,
  History as HistoryIcon
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";

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
  const [countryCode, setCountryCode] = useState("+1");
  const [altCountryCode, setAltCountryCode] = useState("+1");

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
    degree_other: "",
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

          // Extract country code from phone_number if present
          if (saved.phone_number) {
            const parts = saved.phone_number.split(" ");
            if (parts.length > 1 && parts[0].startsWith("+")) {
              setCountryCode(parts[0]);
              mappedData.phone_number = parts.slice(1).join("");
            } else if (saved.phone_number.startsWith("+")) {
              // Fallback if no space
              setCountryCode(saved.phone_number.slice(0, 3));
              mappedData.phone_number = saved.phone_number.slice(3);
            }
          }
          if (saved.alternate_phone) {
            const parts = saved.alternate_phone.split(" ");
            if (parts.length > 1 && parts[0].startsWith("+")) {
              setAltCountryCode(parts[0]);
              mappedData.alternate_phone = parts.slice(1).join("");
            }
          }

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
    "approved", "intake_submitted", "roles_published", "roles_candidate_responded", "roles_suggested", "roles_confirmed",
    "payment_pending", "pending_payment", "payment_completed", "paid", "credentials_submitted", "credential_completed", 
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

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatSalary = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    if (!numeric) return "";
    return new Intl.NumberFormat("en-US").format(parseInt(numeric));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    // Validate date formats
    const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/;
    if (formData.date_of_birth && !dateRegex.test(formData.date_of_birth)) {
      toast({ title: "Invalid Date", description: "Date of Birth must be in MM-DD-YYYY format", variant: "destructive" });
      return;
    }
    if (formData.graduation_date && !dateRegex.test(formData.graduation_date)) {
      toast({ title: "Invalid Date", description: "Graduation Date must be in MM-DD-YYYY format", variant: "destructive" });
      return;
    }
    if (formData.visa_expiry_date && !dateRegex.test(formData.visa_expiry_date)) {
      toast({ title: "Invalid Date", description: "Visa Expiry Date must be in MM-DD-YYYY format", variant: "destructive" });
      return;
    }
    if (formData.ready_to_start_date && !dateRegex.test(formData.ready_to_start_date)) {
      toast({ title: "Invalid Date", description: "Ready to Start Date must be in MM-DD-YYYY format", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const submissionData = {
      ...formData,
      phone_number: `${countryCode} ${formData.phone_number}`,
      alternate_phone: formData.alternate_phone ? `${altCountryCode} ${formData.alternate_phone}` : "",
    };

    try {
      await candidatesApi.submitIntake(candidate.id, submissionData);
      toast({ title: "Intake form submitted!", description: "Your form has been locked and submitted for review." });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      onStatusChange();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation for resume upload file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "The resume file size must be less than 5MB. Please compress and try again.",
        variant: "destructive"
      });
      e.target.value = ""; // Clear input
      return;
    }

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
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-xl shadow-neutral-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10 pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                <FileText className="h-6 w-6 text-primary" /> Client Intake Sheet
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">Please provide your comprehensive professional details for our records.</p>
            </div>
            {isLocked && (
              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                <Lock className="h-3 w-3" /> Submitted & Locked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Section A - Personal Details */}
            <div className="space-y-6">
              {/* <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-secondary" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Personal Details</h3>
              </div> */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">First Name *</Label>
                  <Input value={formData.first_name} onChange={e => handleChange("first_name", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Last Name *</Label>
                  <Input value={formData.last_name} onChange={e => handleChange("last_name", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Date of Birth *</Label>
                  <DatePicker
                    id="intake-date_of_birth"
                    value={formData.date_of_birth}
                    onChange={val => handleChange("date_of_birth", val)}
                    placeholder="MM-DD-YYYY"
                    className={isLocked ? "opacity-50 pointer-events-none" : "h-11"}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Select value={countryCode} onValueChange={setCountryCode} disabled={isLocked}>
                      <SelectTrigger className="h-11 w-[100px] rounded-xl bg-neutral-50 border-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+91">🇮🇳 +91</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+61">🇦🇺 +61</SelectItem>
                        <SelectItem value="+971">🇦🇪 +971</SelectItem>
                        <SelectItem value="+1-CAN">🇨🇦 +1</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="tel"
                      value={formData.phone_number}
                      onChange={e => handleChange("phone_number", e.target.value.replace(/\D/g, '').slice(0, 10))}
                      disabled={isLocked}
                      required
                      placeholder="1234567890"
                      className="h-11 flex-1 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Alternate Phone</Label>
                  <div className="flex gap-2">
                    <Select value={altCountryCode} onValueChange={setAltCountryCode} disabled={isLocked}>
                      <SelectTrigger className="h-11 w-[100px] rounded-xl bg-neutral-50 border-neutral-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+91">🇮🇳 +91</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+61">🇦🇺 +61</SelectItem>
                        <SelectItem value="+971">🇦🇪 +971</SelectItem>
                        <SelectItem value="+1-CAN">🇨🇦 +1</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="tel"
                      value={formData.alternate_phone}
                      onChange={e => handleChange("alternate_phone", e.target.value.replace(/\D/g, '').slice(0, 10))}
                      disabled={isLocked}
                      placeholder="1234567890"
                      className="h-11 flex-1 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Email *</Label>
                  <Input type="email" value={formData.email} onChange={e => handleChange("email", e.target.value)} disabled required className="h-11 rounded-xl bg-neutral-50 border-neutral-200 opacity-60" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium ml-1">Current Address *</Label>
                  <Input value={formData.current_address} onChange={e => handleChange("current_address", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">City *</Label><Input value={formData.city} onChange={e => handleChange("city", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">State *</Label><Input value={formData.state} onChange={e => handleChange("state", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Country *</Label><Input value={formData.country} onChange={e => handleChange("country", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Zip Code *</Label><Input value={formData.zip_code} onChange={e => handleChange("zip_code", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200" /></div>
                </div>
              </div>
            </div>

            {/* Section B - Education */}
            <div className="space-y-6">
              {/* <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Award className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600">Education Background</h3>
              </div> */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-sm font-medium ml-1">University Name *</Label>
                    <Input value={formData.university_name} onChange={e => handleChange("university_name", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Degree *</Label>
                    <Select value={formData.degree} onValueChange={v => handleChange("degree", v)} disabled={isLocked}>
                      <SelectTrigger className="h-11 rounded-xl bg-neutral-50"><SelectValue placeholder="Select degree" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bachelors">Bachelor's</SelectItem>
                        <SelectItem value="masters">Master's</SelectItem>
                        <SelectItem value="phd">PhD</SelectItem>
                        <SelectItem value="associate">Associate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Major *</Label>
                    <Input value={formData.major} onChange={e => handleChange("major", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50 border-neutral-200" />
                  </div>

                  {formData.degree === "other" && (
                    <div className="sm:col-span-2 animate-in slide-in-from-top-1 space-y-2">
                      <Label className="text-sm font-medium ml-1">Please Specify Degree *</Label>
                      <Input value={formData.degree_other} onChange={e => handleChange("degree_other", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50" />
                    </div>
                  )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Graduation Date *</Label>
                  <DatePicker
                    id="intake-graduation_date"
                    value={formData.graduation_date}
                    onChange={val => handleChange("graduation_date", val)}
                    placeholder="MM-DD-YYYY"
                    className={isLocked ? "opacity-50 pointer-events-none" : "h-11"}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium ml-1">Additional Certifications</Label>
                  <Textarea value={formData.additional_certifications} onChange={e => handleChange("additional_certifications", e.target.value)} disabled={isLocked} className="rounded-xl bg-neutral-50 border-neutral-200 min-h-[100px]" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium ml-1">Academic Projects</Label>
                  <Textarea value={formData.academic_projects} onChange={e => handleChange("academic_projects", e.target.value)} disabled={isLocked} className="rounded-xl bg-neutral-50 border-neutral-200 min-h-[100px]" />
                </div>
              </div>
            </div>

            {/* Section C - Work Authorization */}
            <div className="space-y-6">
              {/* <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-green-600">Work Authorization</h3>
              </div> */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Visa Type *</Label>
                  <Select value={formData.visa_type} onValueChange={v => handleChange("visa_type", v)} disabled={isLocked} required>
                    <SelectTrigger className="h-11 rounded-xl bg-neutral-50"><SelectValue placeholder="Select type" /></SelectTrigger>
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
                {formData.visa_type === "Other" && (
                  <div className="space-y-2 animate-in slide-in-from-top-1">
                    <Label className="text-sm font-medium ml-1">Please specify *</Label>
                    <Input value={(formData as any).visa_type_other || ""} onChange={e => handleChange("visa_type_other", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Visa Expiry Date</Label>
                  <DatePicker
                    id="intake-visa_expiry_date"
                    value={formData.visa_expiry_date}
                    onChange={val => handleChange("visa_expiry_date", val)}
                    placeholder="MM-DD-YYYY"
                    className={isLocked ? "opacity-50 pointer-events-none" : "h-11"}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Work Authorization Status *</Label>
                  <Select value={formData.work_authorization_status} onValueChange={v => handleChange("work_authorization_status", v)} disabled={isLocked}>
                    <SelectTrigger className="h-11 rounded-xl bg-neutral-50"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Authorized">Authorized</SelectItem>
                      <SelectItem value="Requires Sponsorship">Requires Sponsorship</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Sponsorship Required? *</Label>
                  <div className="flex items-center gap-8 py-2.5 px-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.sponsorship_required === true} onChange={() => handleChange("sponsorship_required", true as any)} disabled={isLocked} className="accent-primary h-4 w-4" /> Yes</label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.sponsorship_required === false} onChange={() => handleChange("sponsorship_required", false as any)} disabled={isLocked} className="accent-primary h-4 w-4" /> No</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section D - Job Preferences */}
            <div className="space-y-6">
              {/* <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <LayoutDashboard className="h-4 w-4 text-orange-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-orange-600">Job Preferences</h3>
              </div> */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2"><Label className="text-sm font-medium ml-1">Target Roles *</Label><Input value={formData.target_roles} onChange={e => handleChange("target_roles", e.target.value)} placeholder="e.g. Software Engineer, Data Scientist" disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50" /></div>
                <div className="sm:col-span-2 space-y-2"><Label className="text-sm font-medium ml-1">Preferred Locations *</Label><Input value={formData.preferred_locations} onChange={e => handleChange("preferred_locations", e.target.value)} placeholder="e.g. New York, Remote" disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50" /></div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Remote Preference *</Label>
                  <Select value={formData.remote_preference} onValueChange={v => handleChange("remote_preference", v)} disabled={isLocked}>
                    <SelectTrigger className="h-11 rounded-xl bg-neutral-50"><SelectValue placeholder="Select preference" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="On-site">On-site</SelectItem>
                      <SelectItem value="Any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Salary Expectation (USD / Year) *</Label>
                  <Input
                    type="text"
                    value={formData.salary_expectation}
                    onChange={e => handleChange("salary_expectation", formatSalary(e.target.value))}
                    placeholder="e.g. 80,000"
                    disabled={isLocked}
                    required
                    className="h-11 rounded-xl bg-neutral-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Willing to Relocate? *</Label>
                  <div className="flex items-center gap-8 py-2.5 px-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.relocation_preference === true} onChange={() => handleChange("relocation_preference", true as any)} disabled={isLocked} className="accent-primary h-4 w-4" /> Yes</label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.relocation_preference === false} onChange={() => handleChange("relocation_preference", false as any)} disabled={isLocked} className="accent-primary h-4 w-4" /> No</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section E - Professional Background */}
            <div className="space-y-6">
              {/* <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-purple-600">Professional Background</h3>
              </div> */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2"><Label className="text-sm font-medium ml-1">Years of Experience *</Label><Input type="number" value={formData.years_of_experience} onChange={e => handleChange("years_of_experience", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium ml-1">Recent Employer</Label><Input value={formData.recent_employer} onChange={e => handleChange("recent_employer", e.target.value)} disabled={isLocked} className="h-11 rounded-xl bg-neutral-50" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium ml-1">Current Job Title</Label><Input value={formData.current_job_title} onChange={e => handleChange("current_job_title", e.target.value)} disabled={isLocked} className="h-11 rounded-xl bg-neutral-50" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium ml-1">LinkedIn URL *</Label><Input type="url" value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} disabled={isLocked} required className="h-11 rounded-xl bg-neutral-50" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium ml-1">GitHub URL</Label><Input type="url" value={formData.github_url} onChange={e => handleChange("github_url", e.target.value)} disabled={isLocked} className="h-11 rounded-xl bg-neutral-50" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium ml-1">Portfolio URL</Label><Input type="url" value={formData.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} disabled={isLocked} className="h-11 rounded-xl bg-neutral-50" /></div>
                <div className="sm:col-span-2 space-y-2"><Label className="text-sm font-medium ml-1">Technologies or Skills *</Label><Textarea value={formData.technologies_or_skills} onChange={e => handleChange("technologies_or_skills", e.target.value)} disabled={isLocked} required className="rounded-xl bg-neutral-50 min-h-[120px]" /></div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium ml-1">Resume Upload (PDF/DOCX) *</Label>
                  <div className={cn("p-6 border-2 border-dashed rounded-2xl transition-all", formData.resume_url ? "bg-green-50 border-green-200" : "bg-neutral-50 border-neutral-200 hover:border-primary/40")}>
                    {!isLocked && (
                      <Input type="file" onChange={handleFileUpload} disabled={isLocked} accept=".pdf,.doc,.docx" required={!formData.resume_url} className="mb-4 h-11 py-2 cursor-pointer" />
                    )}
                    {formData.resume_url ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-green-700 font-bold flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" /> Resume successfully attached.
                        </p>
                        <Button variant="outline" size="sm" asChild className="h-9 px-4 bg-white border-green-200 text-green-700 hover:bg-green-600 hover:text-white transition-all shadow-sm">
                          <a href={formData.resume_url} target="_blank" rel="noreferrer">Preview / Download Resume</a>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No resume uploaded yet. This field is required.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section F - Marketing Inputs */}
            <div className="space-y-6">
              {/* <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <HistoryIcon className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-red-600">Marketing Inputs</h3>
              </div> */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Ready to Start Date *</Label>
                  <DatePicker
                    id="intake-ready_to_start_date"
                    value={formData.ready_to_start_date}
                    onChange={val => handleChange("ready_to_start_date", val)}
                    placeholder="MM-DD-YYYY"
                    className={isLocked ? "opacity-50 pointer-events-none" : "h-11"}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1">Preferred Employment Type *</Label>
                  <Select value={formData.preferred_employment_type} onValueChange={v => handleChange("preferred_employment_type", v)} disabled={isLocked}>
                    <SelectTrigger className="h-11 rounded-xl bg-neutral-50"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="C2C">C2C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-2"><Label className="text-sm font-medium ml-1">Additional Notes</Label><Textarea value={formData.additional_notes} onChange={e => handleChange("additional_notes", e.target.value)} disabled={isLocked} className="rounded-xl bg-neutral-50 min-h-[100px]" /></div>
              </div>
            </div>

            {canSubmit && (
              <div className="pt-8 border-t border-neutral-100">
                <Button
                  type="submit"
                  variant="hero"
                  className={`w-full h-14 text-lg font-bold shadow-2xl shadow-primary/20 ${!submitting ? 'hover:scale-[1.02] active:scale-[0.98]' : ''} transition-all duration-300 rounded-2xl`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2"><Lock className="h-5 w-5 animate-pulse" /> Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-2">Submit & Lock Intake Form <CheckCircle className="h-5 w-5" /></span>
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground mt-4 font-medium italic opacity-70">
                  Note: Submitting this form will lock it for administrative review. Ensure all details are accurate.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateIntakePage;
