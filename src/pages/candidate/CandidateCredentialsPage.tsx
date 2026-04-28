import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, filesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Lock, FileText, History as HistoryIcon, Clock, User, X,
  LayoutDashboard, Briefcase, KeyRound, DollarSign, CreditCard,
  ClipboardList, Phone, UserPlus, MessageSquare, Settings,
  Shield, CheckCircle, Download, Eye, EyeOff, Plus, Trash2
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";
import DocumentPreview from "@/components/dashboard/DocumentPreview";

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
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countryCode, setCountryCode] = useState("+1");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const [formData, setFormData] = useState({
    // Personal & Contact
    full_name_as_resume: "",
    personal_email: "",
    phone_number: "",
    location_city_state: "",

    // Education & OPT dates
    bachelors_graduation_date: "",
    masters_graduation_date: "",
    first_entry_us: "",
    opt_start_date: "",
    opt_offer_letter_submitted: "" as "" | "yes" | "no" | "waiting",
    opt_offer_letter_url: "",

    // Marketing preferences
    preferred_job_roles: "",
    preferred_locations: "",

    // Professional URLs
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

    // Platform credentials
    shared_email: "",
    gmail_password: "",
    linkedin_login_id: "",
    linkedin_password: "",
    indeed_login_id: "",
    indeed_password: "",
    dice_login_id: "",
    dice_password: "",
    monster_login_id: "",
    monster_password: "",
    ziprecruiter_login_id: "",
    ziprecruiter_password: "",
    foundit_password: "",
    custom_platforms: [] as Array<{ platform_name: string; password: string }>,
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

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields check
    if (!formData.full_name_as_resume?.trim()) newErrors.full_name_as_resume = "Full name as on resume is required";
    if (!formData.personal_email?.trim()) newErrors.personal_email = "Personal email address is required";
    if (!formData.location_city_state?.trim()) newErrors.location_city_state = "Location (City, State) is required";

    // Phone validation
    const cleanPhone = formData.phone_number?.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone_number = "A valid 10-digit phone number is required";
    }

    if (!formData.bachelors_graduation_date) newErrors.bachelors_graduation_date = "Bachelor's graduation date is required";
    if (!formData.first_entry_us) newErrors.first_entry_us = "First entry into the U.S. is required";
    if (!formData.opt_start_date) newErrors.opt_start_date = "OPT start date is required";
    if (!formData.opt_offer_letter_submitted) newErrors.opt_offer_letter_submitted = "Please specify if OPT offer letter is submitted";

    if (formData.opt_offer_letter_submitted === 'yes' && !formData.opt_offer_letter_url) {
      newErrors.opt_offer_letter_url = "Please upload your OPT offer letter";
    }

    if (!formData.preferred_job_roles?.trim()) newErrors.preferred_job_roles = "Preferred job roles are required";
    if (!formData.preferred_locations?.trim()) newErrors.preferred_locations = "Preferred locations are required";
    if (!formData.linkedin_url?.trim()) newErrors.linkedin_url = "LinkedIn URL is required";
    if (!formData.primary_resume) newErrors.primary_resume = "Primary resume upload is required";

    if (!formData.work_history_summary?.trim()) newErrors.work_history_summary = "Professional history summary is required";
    if (!formData.skills_summary?.trim()) newErrors.skills_summary = "Skills summary is required";
    if (!formData.tools_and_technologies?.trim()) newErrors.tools_and_technologies = "Tools & technologies summary is required";

    if (!formData.shared_email?.trim()) newErrors.shared_email = "Shared platform email is required";
    if (!formData.gmail_password?.trim()) newErrors.gmail_password = "Gmail password is required";
    if (!formData.linkedin_login_id?.trim()) newErrors.linkedin_login_id = "LinkedIn login ID is required";
    if (!formData.linkedin_password?.trim()) newErrors.linkedin_password = "LinkedIn password is required";
    if (!formData.visa_details?.trim()) newErrors.visa_details = "Visa details are required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.keys(newErrors)[0];
      const el = document.getElementById(`cred-${firstError}`) || document.getElementsByName(firstError)[0];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.focus();
        }
      }

      toast({
        title: "Missing Information",
        description: "Please fill in all required fields marked with *",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const submissionData = {
      ...formData,
      phone_number: `${countryCode} ${formData.phone_number}`
    };

    try {
      await candidatesApi.upsertCredential(candidate.id, submissionData);
      toast({
        title: versions.length === 0 ? "Credentials submitted!" : "Credentials updated!",
        description: "A new version has been saved successfully."
      });
      setIsEditing(false);
      onStatusChange();
      const { data } = await candidatesApi.getCredentials(candidate.id);
      setVersions(data || []);
    } catch (err: any) {
      const validationErrors = err.response?.data?.validation_errors;
      if (validationErrors) {
        setErrors(validationErrors);
        toast({ title: "Validation Error", description: "Please fix the highlighted fields.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
      }
    }
    setSubmitting(false);
  };

  const isFormFilled =
    formData.full_name_as_resume.trim() !== "" &&
    formData.phone_number.trim() !== "" &&
    formData.linkedin_url.trim() !== "" &&
    formData.primary_resume !== "" &&
    formData.work_history_summary.trim() !== "" &&
    formData.skills_summary.trim() !== "" &&
    formData.tools_and_technologies.trim() !== "" &&
    formData.shared_email.trim() !== "" &&
    formData.gmail_password.trim() !== "" &&
    formData.linkedin_password.trim() !== "" &&
    formData.visa_details.trim() !== "" &&
    formData.bachelors_graduation_date !== "" &&
    formData.opt_start_date !== "" &&
    formData.preferred_job_roles.trim() !== "" &&
    formData.preferred_locations.trim() !== "";

  if (loading) {
    return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading credentials...</p></div>;
  }

  const SENSITIVE_FIELDS = ["visa_details", "references_if_needed", "gmail_password", "linkedin_password", "indeed_password", "dice_password", "foundit_password"];
  const maskSensitive = (key: string, value: string) => {
    if (key === "custom_platforms") return "******** (Sensitive Custom Platforms)";
    if (SENSITIVE_FIELDS.includes(key) && value) return "******** (Sensitive Data Masked)";
    return value;
  };

  const latestVersion = versions[0];

  const hasSubmission = versions.length > 0;
  const isLocked = hasSubmission && !isEditing;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-8">
        {/* Current version info */}
        {latestVersion && (
          <Card className="border-none shadow-lg shadow-neutral-100/50 bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden ring-1 ring-neutral-200/50">
            <CardContent className="flex items-center gap-5 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 border border-secondary/10">
                <HistoryIcon className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Current Version {latestVersion.version}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Last updated by {editorProfiles[latestVersion.edited_by] || "Candidate"} on{" "}
                  {new Date(latestVersion.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-3 py-1 rounded-full bg-secondary/5 text-secondary border-secondary/10 font-bold text-[10px]">
                  {versions.length} REVISIONS
                </Badge>
                {isLocked && (
                  <Button
                    variant="outline"
                    className="h-9 px-4 rounded-xl font-bold text-xs border-secondary/30 text-secondary hover:bg-secondary/5"
                    onClick={() => setIsEditing(true)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Update Credentials
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Locked State — Read Only View */}
        {isLocked && latestVersion?.data && (
          <Card className="border-none shadow-xl shadow-neutral-200/50 rounded-2xl overflow-hidden">
            <CardHeader className="bg-green-50 border-b border-green-100 pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                    <Lock className="h-6 w-6 text-green-600" /> Credential Intake — Submitted
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-green-700">Your credentials have been submitted and locked. Click "Update Credentials" to make changes (creates a new version).</CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-bold h-8 px-4 rounded-full gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" /> Locked
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(latestVersion.data as Record<string, any>).map(([key, value]) => {
                  if (!value || key === 'custom_platforms') return null;
                  return (
                    <div key={key} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">{key.replace(/_/g, " ")}</span>
                      <span className="text-sm font-medium text-foreground break-words">
                        {SENSITIVE_FIELDS.includes(key) && value ? "••••••••" :
                          (key.includes('url') || key.includes('resume')) && typeof value === 'string' ? (
                            <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">View File</a>
                          ) : typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {latestVersion.data.custom_platforms && (latestVersion.data.custom_platforms as any[]).length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block mb-2">Custom Platforms</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(latestVersion.data.custom_platforms as any[]).map((cp: any, i: number) => (
                      <div key={i} className="text-sm font-medium">{cp.platform_name}: ••••••••</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Form — shown when no submissions yet or when editing */}
        {(!isLocked) && (
          <Card className="border-none shadow-xl shadow-neutral-200/50 rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                    <Shield className="h-6 w-6 text-primary" /> Credential Intake Sheet
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-muted-foreground">
                    {isEditing ? "Editing credentials — saving will create a new version." : "Detailed marketing profile. Every update creates a new version for tracking."}
                  </CardDescription>
                </div>
                {isEditing && (
                  <Button variant="ghost" className="h-9 px-4 rounded-xl text-xs font-bold text-muted-foreground" onClick={() => setIsEditing(false)}>
                    <X className="h-3.5 w-3.5 mr-1.5" /> Cancel Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <form className="space-y-10">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-sm font-medium ml-1">Full Name as on Resume *</Label>
                    <Input id="cred-full_name_as_resume" value={formData.full_name_as_resume} onChange={e => handleChange("full_name_as_resume", e.target.value)} required className={cn("h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm", errors.full_name_as_resume && "border-red-500 ring-1 ring-red-500/20")} />
                    {errors.full_name_as_resume && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.full_name_as_resume}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Personal Email Address *</Label>
                    <Input id="cred-personal_email" type="email" value={formData.personal_email} onChange={e => handleChange("personal_email", e.target.value)} required placeholder="personal@email.com" className={cn("h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm", errors.personal_email && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.personal_email && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.personal_email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Location (City, State) *</Label>
                    <Input id="cred-location_city_state" value={formData.location_city_state} onChange={e => handleChange("location_city_state", e.target.value)} required placeholder="e.g. Dallas, TX" className={cn("h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm", errors.location_city_state && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.location_city_state && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.location_city_state}</p>}
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-sm font-medium ml-1">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode}>
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
                        id="cred-phone_number"
                        type="tel"
                        value={formData.phone_number}
                        onChange={e => handleChange("phone_number", e.target.value.replace(/\D/g, '').slice(0, 10))}
                        required
                        placeholder="1234567890"
                        className={cn("h-11 flex-1 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm", errors.phone_number && "border-destructive ring-1 ring-destructive/20")}
                      />
                    </div>
                    {errors.phone_number && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.phone_number}</p>}
                  </div>
                </div>

                {/* OPT / Education Dates */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-6 space-y-5">
                  <div className="flex items-center gap-3 border-b border-blue-100 pb-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-blue-700" />
                    </div>
                    <h3 className="font-bold text-xs uppercase tracking-widest text-blue-900">Education & OPT Details</h3>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1 text-blue-900">Bachelor's Graduation Date *</Label>
                      <DatePicker id="cred-bachelors_graduation_date" value={formData.bachelors_graduation_date} onChange={val => handleChange("bachelors_graduation_date", val)} placeholder="MM-DD-YYYY" className={cn("h-11", errors.bachelors_graduation_date && "border-destructive ring-1 ring-destructive/20")} />
                      {errors.bachelors_graduation_date && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.bachelors_graduation_date}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1 text-blue-900">Master's Graduation Date</Label>
                      <DatePicker id="cred-masters-grad" value={formData.masters_graduation_date} onChange={val => handleChange("masters_graduation_date", val)} placeholder="MM-DD-YYYY (if applicable)" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1 text-blue-900">First Entry into the U.S. *</Label>
                      <DatePicker id="cred-first_entry_us" value={formData.first_entry_us} onChange={val => handleChange("first_entry_us", val)} placeholder="MM-DD-YYYY" className={cn("h-11", errors.first_entry_us && "border-destructive ring-1 ring-destructive/20")} />
                      {errors.first_entry_us && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.first_entry_us}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1 text-blue-900">OPT Start Date *</Label>
                      <DatePicker id="cred-opt_start_date" value={formData.opt_start_date} onChange={val => handleChange("opt_start_date", val)} placeholder="MM-DD-YYYY" className={cn("h-11", errors.opt_start_date && "border-destructive ring-1 ring-destructive/20")} />
                      {errors.opt_start_date && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.opt_start_date}</p>}
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-sm font-medium ml-1 text-blue-900">OPT Offer Letter Submitted? *</Label>
                      <div id="cred-opt_offer_letter_submitted" className={cn("flex items-center gap-6 py-2.5 px-4 bg-white rounded-xl border", errors.opt_offer_letter_submitted ? "border-destructive ring-1 ring-destructive/20" : "border-blue-100")}>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.opt_offer_letter_submitted === "yes"} onChange={() => handleChange("opt_offer_letter_submitted", "yes")} className="accent-blue-600 h-4 w-4" /> Yes</label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.opt_offer_letter_submitted === "no"} onChange={() => handleChange("opt_offer_letter_submitted", "no")} className="accent-blue-600 h-4 w-4" /> No</label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.opt_offer_letter_submitted === "waiting"} onChange={() => handleChange("opt_offer_letter_submitted", "waiting")} className="accent-blue-600 h-4 w-4" /> Waiting for one</label>
                      </div>
                      {errors.opt_offer_letter_submitted && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.opt_offer_letter_submitted}</p>}
                    </div>
                    {formData.opt_offer_letter_submitted === "yes" && (
                      <div className="sm:col-span-2 space-y-2">
                        <Label className="text-sm font-medium ml-1 text-blue-900">Upload Offer Letter *</Label>
                        <div id="cred-opt_offer_letter_url" className={cn("p-4 border-2 border-dashed rounded-xl transition-all", formData.opt_offer_letter_url ? "bg-green-50 border-green-200" : (errors.opt_offer_letter_url ? "bg-red-50 border-destructive" : "bg-white border-blue-200 hover:border-blue-400"))}>
                          <Input type="file" onChange={e => handleFileUpload(e, "opt_offer_letter_url")} accept=".pdf,.doc,.docx" className="mb-2 h-10 py-1.5 cursor-pointer text-xs" />
                          {formData.opt_offer_letter_url && <p className="text-[11px] text-green-700 font-bold flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> File attached (<DocumentPreview url={formData.opt_offer_letter_url} label="Preview" className="text-green-700 hover:text-green-900 underline" />)</p>}
                          {errors.opt_offer_letter_url && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.opt_offer_letter_url}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Marketing Preferences */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-sm font-medium ml-1">Preferred Job Roles for Marketing *</Label>
                    <Input id="cred-preferred_job_roles" value={formData.preferred_job_roles} onChange={e => handleChange("preferred_job_roles", e.target.value)} required placeholder="e.g. Java Developer, Data Engineer, Business Analyst" className={cn("h-11 rounded-xl bg-neutral-50", errors.preferred_job_roles && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.preferred_job_roles && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.preferred_job_roles}</p>}
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-sm font-medium ml-1">Preferred Location(s) *</Label>
                    <Input id="cred-preferred_locations" value={formData.preferred_locations} onChange={e => handleChange("preferred_locations", e.target.value)} required placeholder="e.g. Dallas, TX; Remote; Chicago, IL" className={cn("h-11 rounded-xl bg-neutral-50", errors.preferred_locations && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.preferred_locations && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.preferred_locations}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">LinkedIn URL *</Label>
                    <Input id="cred-linkedin_url" type="url" value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} required className={cn("h-11 rounded-xl bg-neutral-50", errors.linkedin_url && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.linkedin_url && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.linkedin_url}</p>}
                  </div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">GitHub URL</Label><Input type="url" value={formData.github_url} onChange={e => handleChange("github_url", e.target.value)} className="h-11 rounded-xl bg-neutral-50" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Portfolio URL</Label><Input type="url" value={formData.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} className="h-11 rounded-xl bg-neutral-50" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Relocation Preference</Label><Input value={formData.relocation_preference} onChange={e => handleChange("relocation_preference", e.target.value)} placeholder="e.g. Open to US, Prefer East Coast" className="h-11 rounded-xl bg-neutral-50" /></div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Primary Resume (PDF/DOCX) *</Label>
                    <div id="cred-primary_resume" className={cn("p-4 border-2 border-dashed rounded-xl transition-all", formData.primary_resume ? "bg-green-50 border-green-200" : (errors.primary_resume ? "bg-red-50 border-destructive" : "bg-neutral-50 border-neutral-200 hover:border-primary/40"))}>
                      <Input type="file" onChange={e => handleFileUpload(e, "primary_resume")} accept=".pdf,.doc,.docx" required={!formData.primary_resume} className="mb-2 h-10 py-1.5 cursor-pointer text-xs" />
                      {formData.primary_resume && <p className="text-[11px] text-green-700 font-bold flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> File attached (<DocumentPreview url={formData.primary_resume} label="Preview" className="text-green-700 hover:text-green-900 transition-colors" />)</p>}
                      {errors.primary_resume && <p className="text-[10px] text-destructive mt-1 font-medium animate-in fade-in slide-in-from-top-1">{errors.primary_resume}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Alternate Resume Versions</Label>
                    <div className="p-4 border-2 border-dashed rounded-xl bg-neutral-50 border-neutral-200 hover:border-primary/40 transition-all">
                      <Input type="file" onChange={e => handleFileUpload(e, "alternate_resume_versions")} accept=".pdf,.doc,.docx" className="mb-2 h-10 py-1.5 cursor-pointer text-xs" />
                      <div className="space-y-1.5">
                        {formData.alternate_resume_versions.map((url, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground flex items-center justify-between gap-2 bg-white px-2 py-1 rounded-md border border-neutral-100 font-medium">
                            <span className="truncate flex-1">Version {i + 1}: <DocumentPreview url={url} label="Resume Link" /></span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-destructive/5" onClick={() => setFormData(prev => ({ ...prev, alternate_resume_versions: prev.alternate_resume_versions.filter((_, idx) => idx !== i) }))}><X className="h-3 w-3" /></Button>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Professional / Work History Summary *</Label>
                    <Textarea id="cred-work_history_summary" value={formData.work_history_summary} onChange={e => handleChange("work_history_summary", e.target.value)} rows={5} required className={cn("rounded-xl bg-neutral-50 border-neutral-200 min-h-[120px]", errors.work_history_summary && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.work_history_summary && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.work_history_summary}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Skills Summary *</Label>
                    <Textarea id="cred-skills_summary" value={formData.skills_summary} onChange={e => handleChange("skills_summary", e.target.value)} rows={3} required className={cn("rounded-xl bg-neutral-50 border-neutral-200", errors.skills_summary && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.skills_summary && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.skills_summary}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Tools & Technologies *</Label>
                    <Textarea id="cred-tools_and_technologies" value={formData.tools_and_technologies} onChange={e => handleChange("tools_and_technologies", e.target.value)} rows={3} required className={cn("rounded-xl bg-neutral-50 border-neutral-200", errors.tools_and_technologies && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.tools_and_technologies && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.tools_and_technologies}</p>}
                  </div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Certifications</Label><Textarea value={formData.certifications} onChange={e => handleChange("certifications", e.target.value)} rows={2} className="rounded-xl bg-neutral-50 border-neutral-200" /></div>
                </div>

                <div className="grid gap-6 pt-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 space-y-6 overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-amber-200 pb-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-200 flex items-center justify-center">
                        <KeyRound className="h-4 w-4 text-amber-900" />
                      </div>
                      <h3 className="font-bold text-xs uppercase tracking-widest text-amber-900">Account Credentials</h3>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Shared Email (All Platforms) *</Label>
                        <Input id="cred-shared_email" type="email" className={cn("bg-white text-sm h-10 border-amber-200", errors.shared_email && "border-destructive ring-1 ring-destructive/20")} value={formData.shared_email || ""} onChange={e => handleChange("shared_email", e.target.value)} required placeholder="yourname@gmail.com" />
                        {errors.shared_email && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.shared_email}</p>}
                      </div>
                      {/* Gmail */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Gmail Password *</Label>
                        <div className="relative">
                          <Input id="cred-gmail_password" type={showPasswords["gmail_password"] ? "text" : "password"} value={formData.gmail_password} onChange={e => handleChange("gmail_password", e.target.value)} required className={cn("h-11 rounded-xl bg-white border-amber-200 pr-10", errors.gmail_password && "border-destructive ring-1 ring-destructive/20")} placeholder="••••••••" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground" onClick={() => togglePassword("gmail_password")}>{showPasswords["gmail_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                        {errors.gmail_password && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.gmail_password}</p>}
                      </div>
                      {/* LinkedIn */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">LinkedIn Login ID *</Label>
                        <Input id="cred-linkedin_login_id" type="email" value={formData.linkedin_login_id} onChange={e => handleChange("linkedin_login_id", e.target.value)} required placeholder="LinkedIn email/username" className={cn("h-11 rounded-xl bg-white border-amber-200", errors.linkedin_login_id && "border-destructive ring-1 ring-destructive/20")} />
                        {errors.linkedin_login_id && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.linkedin_login_id}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">LinkedIn Password *</Label>
                        <div className="relative">
                          <Input id="cred-linkedin_password" type={showPasswords["linkedin_password"] ? "text" : "password"} value={formData.linkedin_password} onChange={e => handleChange("linkedin_password", e.target.value)} required className={cn("h-11 rounded-xl bg-white border-amber-200 pr-10", errors.linkedin_password && "border-destructive ring-1 ring-destructive/20")} placeholder="••••••••" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground" onClick={() => togglePassword("linkedin_password")}>{showPasswords["linkedin_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                        {errors.linkedin_password && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.linkedin_password}</p>}
                      </div>
                      {/* Indeed */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Indeed Login ID (Optional)</Label>
                        <Input value={formData.indeed_login_id} onChange={e => handleChange("indeed_login_id", e.target.value)} placeholder="Indeed email/username (N/A if none)" className="h-11 rounded-xl bg-white/50 border-amber-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Indeed Password (Optional)</Label>
                        <div className="relative">
                          <Input type={showPasswords["indeed_password"] ? "text" : "password"} value={formData.indeed_password} onChange={e => handleChange("indeed_password", e.target.value)} className="h-11 rounded-xl bg-white/50 border-amber-100 pr-10" placeholder="••••••••" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground" onClick={() => togglePassword("indeed_password")}>{showPasswords["indeed_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                      </div>
                      {/* Dice */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Dice Login ID (Optional)</Label>
                        <Input value={formData.dice_login_id} onChange={e => handleChange("dice_login_id", e.target.value)} placeholder="Dice email/username (N/A if not created)" className="h-11 rounded-xl bg-white/50 border-amber-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Dice Password (Optional)</Label>
                        <div className="relative">
                          <Input type={showPasswords["dice_password"] ? "text" : "password"} value={formData.dice_password} onChange={e => handleChange("dice_password", e.target.value)} className="h-11 rounded-xl bg-white/50 border-amber-100 pr-10" placeholder="••••••••" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground" onClick={() => togglePassword("dice_password")}>{showPasswords["dice_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                      </div>
                      {/* Monster */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Monster Login ID (Optional)</Label>
                        <Input value={formData.monster_login_id} onChange={e => handleChange("monster_login_id", e.target.value)} placeholder="Monster email/username (N/A if none)" className="h-11 rounded-xl bg-white/50 border-amber-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Monster Password (Optional)</Label>
                        <div className="relative">
                          <Input type={showPasswords["monster_password"] ? "text" : "password"} value={formData.monster_password} onChange={e => handleChange("monster_password", e.target.value)} className="h-11 rounded-xl bg-white/50 border-amber-100 pr-10" placeholder="••••••••" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground" onClick={() => togglePassword("monster_password")}>{showPasswords["monster_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                      </div>
                      {/* ZipRecruiter */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">ZipRecruiter Login ID (Optional)</Label>
                        <Input value={formData.ziprecruiter_login_id} onChange={e => handleChange("ziprecruiter_login_id", e.target.value)} placeholder="ZipRecruiter email/username (N/A if none)" className="h-11 rounded-xl bg-white/50 border-amber-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">ZipRecruiter Password (Optional)</Label>
                        <div className="relative">
                          <Input type={showPasswords["ziprecruiter_password"] ? "text" : "password"} value={formData.ziprecruiter_password} onChange={e => handleChange("ziprecruiter_password", e.target.value)} className="h-11 rounded-xl bg-white/50 border-amber-100 pr-10" placeholder="••••••••" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground" onClick={() => togglePassword("ziprecruiter_password")}>{showPasswords["ziprecruiter_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                      </div>
                      {/* Foundit */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Foundit Password (Optional)</Label>
                        <div className="relative">
                          <Input type={showPasswords["foundit_password"] ? "text" : "password"} value={formData.foundit_password} onChange={e => handleChange("foundit_password", e.target.value)} className="h-11 rounded-xl bg-white/50 border-amber-100 pr-10" placeholder="••••••••" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground" onClick={() => togglePassword("foundit_password")}>{showPasswords["foundit_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                      </div>
                    </div>

                    {/* Custom Job Platforms */}
                    <div className="border-t border-amber-200 pt-6 mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium ml-1 text-amber-900">Custom Job Platforms</Label>
                        <Button type="button" variant="outline" size="sm" className="h-8 border-amber-200 text-amber-900 bg-amber-50 hover:bg-amber-100" onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            custom_platforms: [...(prev.custom_platforms || []), { platform_name: "", password: "" }]
                          }));
                        }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Platform
                        </Button>
                      </div>
                      {formData.custom_platforms?.map((platform, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-3 bg-amber-100/50 rounded-xl relative group">
                          <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => {
                            setFormData(prev => {
                              const newPlatforms = [...prev.custom_platforms];
                              newPlatforms.splice(idx, 1);
                              return { ...prev, custom_platforms: newPlatforms };
                            });
                          }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="space-y-2 flex-1">
                            <Label className="text-[10px] font-bold uppercase text-amber-800">Platform Name</Label>
                            <Input
                              value={platform.platform_name}
                              onChange={(e) => {
                                const newPlatforms = [...formData.custom_platforms];
                                newPlatforms[idx].platform_name = e.target.value;
                                handleChange("custom_platforms", newPlatforms as any);
                              }}
                              placeholder="e.g. Monster, ZipRecruiter"
                              className="h-10 text-sm bg-white border-amber-200"
                            />
                          </div>
                          <div className="space-y-2 flex-1 relative">
                            <Label className="text-[10px] font-bold uppercase text-amber-800">Password</Label>
                            <div className="relative">
                              <Input
                                type={showPasswords[`custom_${idx}`] ? "text" : "password"}
                                value={platform.password}
                                onChange={(e) => {
                                  const newPlatforms = [...formData.custom_platforms];
                                  newPlatforms[idx].password = e.target.value;
                                  handleChange("custom_platforms", newPlatforms as any);
                                }}
                                className="h-10 text-sm bg-white border-amber-200 pr-9"
                              />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-transparent h-8 w-8" onClick={() => togglePassword(`custom_${idx}`)}>
                                {showPasswords[`custom_${idx}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 space-y-3">
                      <div className="flex items-center gap-2 text-blue-900 mb-2">
                        <Shield className="h-4 w-4" />
                        <Label className="font-bold text-xs uppercase tracking-widest">Visa Details (Sensitive) *</Label>
                      </div>
                      <Textarea id="cred-visa_details" value={formData.visa_details} onChange={e => handleChange("visa_details", e.target.value)} rows={4} placeholder="Full details for internal use only. Include expiry, type, and current status." required className={cn("rounded-xl bg-white border-blue-200", errors.visa_details && "border-destructive ring-1 ring-destructive/20")} />
                      {errors.visa_details && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.visa_details}</p>}
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <MessageSquare className="h-4 w-4" />
                        <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">References (Sensitive)</Label>
                      </div>
                      <Textarea value={formData.references_if_needed} onChange={e => handleChange("references_if_needed", e.target.value as any)} rows={4} placeholder="Name, Role, Company, Email, Phone (If requested by employers)" className="rounded-xl bg-white border-neutral-200" />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-neutral-100">
                  <Button
                    onClick={handleSubmit}
                    type="submit"
                    variant="hero"
                    className="w-full h-14 text-lg font-bold transition-all rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2"><Lock className="h-5 w-5 animate-pulse" /> Saving New Version...</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {versions.length === 0 ? "Submit Marketing Credentials" : "Update Credentials (v" + (versions.length + 1) + ")"}
                        <CheckCircle className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                  <p className="text-center text-[10px] text-muted-foreground mt-4 font-medium italic opacity-70 italic leading-relaxed">
                    Every update creates a historical record of your credentials. Administrative staff will use the latest version for marketing.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Version History — always show when there are versions */}
        {versions.length > 0 && (
          <Card className="border-none shadow-lg rounded-2xl bg-neutral-50/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-3">
                <HistoryIcon className="h-4 w-4 text-muted-foreground" /> Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-3">
                {versions.map((v: any) => (
                  <AccordionItem key={v.id} value={v.id} className="bg-white rounded-xl border border-neutral-200 px-4 shadow-sm overflow-hidden border-none ring-1 ring-neutral-200/50">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-4 text-left">
                        <Badge variant="secondary" className="h-7 w-8 flex items-center justify-center font-bold bg-muted text-muted-foreground">v{v.version}</Badge>
                        <div className="space-y-0.5">
                          <span className="font-bold text-sm block tracking-tight">{editorProfiles[v.edited_by] || "Candidate Correction"}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium italic">
                            <Clock className="h-3 w-3" /> {new Date(v.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                      <div className="grid gap-3 text-sm">
                        {v.data && Object.entries(v.data as Record<string, any>).map(([key, value]) => (
                          value ? (
                            <div key={key} className="col-span-full border-b border-neutral-50 pb-3 last:border-0">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1 opacity-60">{key.replace(/_/g, " ")}:</span>{" "}
                              <div className="text-foreground text-sm font-medium whitespace-pre-wrap leading-relaxed">
                                {Array.isArray(value)
                                  ? value.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-1 mb-2 pl-2 border-l-2 border-secondary/20 bg-secondary/5 p-2 rounded-lg">
                                      {typeof item === 'object' && item !== null ? (
                                        Object.entries(item).map(([k, v]) => (
                                          <div key={k} className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold opacity-40 uppercase">{k}:</span>
                                            <span className="text-xs">{maskSensitive(k, String(v))}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-3 w-3 text-secondary" />
                                          {maskSensitive(key, String(item))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                  : (key.includes('url') || key.includes('resume')) ? (
                                    <DocumentPreview
                                      url={String(value)}
                                      label="View Attached File"
                                      className="text-blue-600 underline font-semibold"
                                    />
                                  ) : maskSensitive(key, String(value))}
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
