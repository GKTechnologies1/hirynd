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
  Lock, FileText, Calendar as CalendarIcon, CheckCircle, Plus, Trash2,
  User, Award, Shield, LayoutDashboard, Briefcase, AlertCircle,
  History as HistoryIcon, Upload, Download, FileCheck
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";
import DocumentPreview from "@/components/dashboard/DocumentPreview";

interface WorkExperience {
  id?: string;
  job_title: string;
  company_name: string;
  company_address: string;
  start_date: string;
  end_date: string;
  job_type: string;
  responsibilities: string;
}

interface Certification {
  id?: string;
  name: string;
  organization: string;
  issued_date: string;
  expires_date?: string;
  credential_url?: string;
}

interface CandidateIntakePageProps {
  candidate: any;
  onStatusChange: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

const CandidateIntakePage = ({ candidate, onStatusChange }: CandidateIntakePageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [intake, setIntake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [altCountryCode, setAltCountryCode] = useState("+1");

  const [formData, setFormData] = useState({
    // Section A - Personal Details
    first_name: "",
    last_name: "",
    date_of_birth: "",
    phone_number: "",
    marketing_email: "",
    marketing_phone: "",
    alternate_phone: "",
    email: user?.email || "",
    current_address: "",
    mailing_address: "",
    city: "",
    state: "",
    country: "",
    zip_code: "",
    first_entry_us: "",
    total_years_us: "",

    // Section B - Education (Primary + Additional)
    highest_degree: "",
    highest_field_of_study: "",
    highest_university: "",
    highest_country: "",
    highest_graduation_date: "",
    bachelors_degree: "",
    bachelors_field_of_study: "",
    bachelors_university: "",
    bachelors_country: "",
    bachelors_graduation_date: "",

    // Section C - Skills (Split)
    primary_skills: "",
    currently_learning: "",
    experienced_tools: "",
    learning_tools: "",
    non_technical_skills: "",

    // Section D - Work Authorization
    visa_type: "",
    visa_type_other: "",
    visa_expiry_date: "",
    work_authorization_status: "",
    sponsorship_required: false,

    // Section E - Job Preferences
    desired_experience: "",
    desired_years_of_experience: "",
    industry_preference: "",
    shift_preference: "",
    target_roles: "",
    preferred_locations: "",
    remote_preference: "",
    salary_expectation: "",
    relocation_preference: false,

    // Section F - Professional Background
    years_of_experience: "",
    recent_employer: "",
    current_job_title: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    resume_url: "",

    // Section G - Documents
    passport_url: "",
    government_id_url: "",
    visa_url: "",
    work_authorization_url: "",
    any_documents_url: "",

    // Section H - Additional
    ready_to_start_date: "",
    preferred_employment_type: "",
    additional_notes: "",

    // Conditional gates
    has_work_experience: "" as "" | "yes" | "no",
    has_certifications: "" as "" | "yes" | "no",

    // Arrays
    experiences: [] as WorkExperience[],
    certifications: [] as Certification[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!candidate) return;
    const fetchIntake = async () => {
      try {
        const { data } = await candidatesApi.getIntake(candidate.id);
        if (data && data.id) {
          setIntake(data);
          const saved = data.data || {};
          const mappedData: any = { ...saved };

          // Extract country codes
          if (saved.phone_number) {
            const parts = saved.phone_number.split(" ");
            if (parts.length > 1 && parts[0].startsWith("+")) {
              setCountryCode(parts[0]);
              mappedData.phone_number = parts.slice(1).join("");
            }
          }
          
          // Map backend education fields to frontend fields if they exist
          if (saved.university_name) mappedData.highest_university = saved.university_name;
          if (saved.major) mappedData.highest_field_of_study = saved.major;
          if (saved.graduation_date) mappedData.highest_graduation_date = saved.graduation_date;

          setFormData(prev => ({
            ...prev,
            ...mappedData,
            email: saved.email || user?.email || prev.email,
            resume_url: saved.resume_url || candidate?.resume_url || prev.resume_url,
            linkedin_url: saved.linkedin_url || candidate?.linkedin_url || prev.linkedin_url,
            experiences: saved.experiences || [],
            certifications: saved.certifications || [],
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
    "approved", "intake_submitted", "roles_published", "roles_candidate_responded",
    "roles_confirmed", "payment_pending", "payment_completed", "credentials_submitted",
    "active_marketing", "placed_closed", "on_hold", "paused", "past_due"
  ].includes(candidate?.status);

  const isLocked = intake?.is_locked === true;
  const canSubmit = !!candidate && !isLocked;

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleArrayAdd = (arrayName: 'experiences' | 'certifications') => {
    const newItem = arrayName === 'experiences'
      ? { job_title: '', company_name: '', company_address: '', start_date: '', end_date: '', job_type: 'full_time', responsibilities: '' }
      : { name: '', organization: '', issued_date: '', expires_date: '', credential_url: '' };
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...(prev[arrayName] || []), newItem]
    }));
  };

  const handleArrayRemove = (arrayName: 'experiences' | 'certifications', index: number) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleArrayChange = (arrayName: 'experiences' | 'certifications', index: number, field: string, value: any) => {
    setFormData(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `File must be less than 10MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        variant: "destructive"
      });
      e.target.value = "";
      return;
    }

    try {
      const { data } = await filesApi.upload(file, "documents");
      handleChange(fieldName, data.url);
      toast({ title: "File uploaded!", description: `${fieldName.replace('_', ' ')} successfully attached.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const formatSalary = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    if (!numeric) return "";
    return new Intl.NumberFormat("en-US").format(parseInt(numeric));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/;

    if (!formData.first_name?.trim()) newErrors.first_name = "First name is required";
    else if (/\d/.test(formData.first_name)) newErrors.first_name = "Numbers not allowed in first name";

    if (!formData.last_name?.trim()) newErrors.last_name = "Last name is required";
    else if (/\d/.test(formData.last_name)) newErrors.last_name = "Numbers not allowed in last name";

    if (!formData.date_of_birth) newErrors.date_of_birth = "Date of birth is required";
    else if (!dateRegex.test(formData.date_of_birth)) newErrors.date_of_birth = "Use MM-DD-YYYY format";

    if (!formData.phone_number?.trim()) newErrors.phone_number = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phone_number.replace(/\D/g, ''))) newErrors.phone_number = "Must be exactly 10 digits";

    if (!formData.highest_degree) newErrors.highest_degree = "Highest degree is required";
    if (!formData.highest_field_of_study) newErrors.highest_field_of_study = "Field of study is required";
    if (!formData.highest_university) newErrors.highest_university = "University is required";
    if (!formData.highest_graduation_date) newErrors.highest_graduation_date = "Graduation date is required";
    else if (!dateRegex.test(formData.highest_graduation_date)) newErrors.highest_graduation_date = "Use MM-DD-YYYY format";

    if (!formData.primary_skills?.trim()) newErrors.primary_skills = "Primary skills are required";
    if (!formData.has_work_experience) newErrors.has_work_experience = "Please specify if you have work experience";
    if (!formData.has_certifications) newErrors.has_certifications = "Please specify if you have certifications";
    if (!formData.visa_type) newErrors.visa_type = "Visa type is required";
    if (formData.visa_type === "Other" && !formData.visa_type_other?.trim()) newErrors.visa_type_other = "Please specify your visa type";
    if (!formData.work_authorization_status) newErrors.work_authorization_status = "Work authorization status is required";
    if (!formData.years_of_experience) newErrors.years_of_experience = "Total years of experience is required";
    if (!formData.linkedin_url?.trim()) newErrors.linkedin_url = "LinkedIn URL is required";
    if (!formData.desired_experience?.trim()) newErrors.desired_experience = "Desired experience summary is required";
    if (!formData.desired_years_of_experience) newErrors.desired_years_of_experience = "Desired years of experience is required";
    if (!formData.industry_preference?.trim()) newErrors.industry_preference = "Industry preference is required";
    if (!formData.shift_preference) newErrors.shift_preference = "Shift preference is required";
    if (!formData.current_address?.trim()) newErrors.current_address = "Current address is required";
    if (!formData.resume_url) newErrors.resume_url = "Resume is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.keys(newErrors)[0];
      const element = document.getElementById(`intake-${firstError}`) || document.getElementsByName(firstError)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (element as HTMLElement).focus();
      }
      toast({
        title: "Validation Error",
        description: "Please correct the highlighted fields.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!validateForm()) return;

    setSubmitting(true);

    const submissionData = {
      ...formData,
      university_name: formData.highest_university,
      major: formData.highest_field_of_study,
      graduation_date: formData.highest_graduation_date,
      phone_number: formData.phone_number,
      marketing_phone: formData.marketing_phone,
      alternate_phone: formData.alternate_phone,
      experiences: formData.experiences.filter(e => e.job_title && e.company_name),
      certifications: formData.certifications.filter(c => c.name && c.organization),
    };

    try {
      await candidatesApi.submitIntake(candidate.id, submissionData);
      toast({ title: "Success!", description: "Your intake form has been submitted and locked for review." });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      onStatusChange();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || err.response?.data?.validation_errors
          ? JSON.stringify(err.response.data.validation_errors)
          : err.message,
        variant: "destructive"
      });
    }
    setSubmitting(false);
  };

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

  if (loading) {
    return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading intake form...</p></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-xl shadow-neutral-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10 pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                <FileText className="h-6 w-6 text-primary" /> Enhanced Client Intake Sheet
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">Complete professional details for our comprehensive review.</p>
            </div>
            {isLocked && (
              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                <Lock className="h-3 w-3" /> Submitted & Locked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <form className="space-y-12">

            {/* ═══ SECTION A: PERSONAL DETAILS ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600">Personal Details</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">First Name *</Label>
                  <Input id="intake-first_name" value={formData.first_name} onChange={e => handleChange("first_name", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.first_name && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.first_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.first_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Last Name *</Label>
                  <Input id="intake-last_name" value={formData.last_name} onChange={e => handleChange("last_name", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.last_name && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.last_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.last_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date of Birth *</Label>
                  <DatePicker id="intake-date_of_birth" value={formData.date_of_birth} onChange={val => handleChange("date_of_birth", val)} placeholder="MM-DD-YYYY" className={cn("h-10", isLocked && "opacity-50 pointer-events-none", errors.date_of_birth && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.date_of_birth && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.date_of_birth}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email *</Label>
                  <Input type="email" value={formData.email} onChange={e => handleChange("email", e.target.value)} disabled required className="h-10 rounded-lg bg-neutral-50 opacity-60" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Select value={countryCode} onValueChange={setCountryCode} disabled={isLocked}>
                      <SelectTrigger className="h-10 w-[90px] rounded-lg bg-neutral-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+91">🇮🇳 +91</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+61">🇦🇺 +61</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input id="intake-phone_number" type="tel" value={formData.phone_number} onChange={e => handleChange("phone_number", e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={isLocked} required placeholder="1234567890" className={cn("h-10 flex-1 rounded-lg bg-neutral-50", errors.phone_number && "border-destructive ring-1 ring-destructive/20")} />
                  </div>
                  {errors.phone_number && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.phone_number}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">New Email for Marketing</Label>
                  <Input type="email" value={formData.marketing_email} onChange={e => handleChange("marketing_email", e.target.value)} disabled={isLocked} placeholder="Optional — separate marketing email" className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Marketing Phone</Label>
                  <Input type="tel" value={formData.marketing_phone} onChange={e => handleChange("marketing_phone", e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={isLocked} placeholder="Optional" className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Alternate Phone</Label>
                  <Input type="tel" value={formData.alternate_phone} onChange={e => handleChange("alternate_phone", e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={isLocked} placeholder="Optional" className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Address *</Label>
                  <Input id="intake-current_address" value={formData.current_address} onChange={e => handleChange("current_address", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.current_address && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.current_address && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.current_address}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Mailing Address</Label>
                  <Input value={formData.mailing_address} onChange={e => handleChange("mailing_address", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                  <div className="space-y-2"><Label className="text-sm font-medium">City</Label><Input value={formData.city} onChange={e => handleChange("city", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium">State</Label><Input value={formData.state} onChange={e => handleChange("state", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium">Country</Label><Input value={formData.country} onChange={e => handleChange("country", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium">Zip Code</Label><Input value={formData.zip_code} onChange={e => handleChange("zip_code", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" /></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">First Entry to US</Label>
                  <DatePicker id="intake-first-entry-us" value={formData.first_entry_us} onChange={val => handleChange("first_entry_us", val)} placeholder="MM-DD-YYYY" className={cn("h-10", isLocked && "opacity-50 pointer-events-none")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Total Years in US</Label>
                  <Input type="number" value={formData.total_years_us} onChange={e => handleChange("total_years_us", e.target.value)} disabled={isLocked} placeholder="e.g. 3" className="h-10 rounded-lg bg-neutral-50" />
                </div>
              </div>
            </div>

            {/* ═══ SECTION B: EDUCATION ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Award className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-purple-600">Education</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Highest Degree *</Label>
                  <Select value={formData.highest_degree} onValueChange={v => handleChange("highest_degree", v)} disabled={isLocked}>
                    <SelectTrigger id="intake-highest_degree" className={cn("h-10 rounded-lg bg-neutral-50", errors.highest_degree && "border-destructive ring-1 ring-destructive/20")}>
                      <SelectValue placeholder="Select degree" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelors">Bachelors</SelectItem>
                      <SelectItem value="Masters">Masters</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Certificate">Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.highest_degree && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.highest_degree}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Field of Study *</Label>
                  <Input id="intake-highest_field_of_study" value={formData.highest_field_of_study} onChange={e => handleChange("highest_field_of_study", e.target.value)} disabled={isLocked} required placeholder="e.g. Computer Science" className={cn("h-10 rounded-lg bg-neutral-50", errors.highest_field_of_study && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.highest_field_of_study && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.highest_field_of_study}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">University *</Label>
                  <Input id="intake-highest_university" value={formData.highest_university} onChange={e => handleChange("highest_university", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.highest_university && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.highest_university && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.highest_university}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Country</Label>
                  <Input value={formData.highest_country} onChange={e => handleChange("highest_country", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Graduation Date *</Label>
                  <DatePicker id="intake-highest_graduation_date" value={formData.highest_graduation_date} onChange={val => handleChange("highest_graduation_date", val)} placeholder="MM-DD-YYYY" className={cn("h-10", isLocked && "opacity-50 pointer-events-none", errors.highest_graduation_date && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.highest_graduation_date && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.highest_graduation_date}</p>}
                </div>

                {/* Bachelors */}
                <div className="sm:col-span-2 border-t border-neutral-200 pt-4 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-4">Additional Education Detail</h4>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bachelors Degree</Label>
                  <Input value={formData.bachelors_degree} onChange={e => handleChange("bachelors_degree", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bachelors Field</Label>
                  <Input value={formData.bachelors_field_of_study} onChange={e => handleChange("bachelors_field_of_study", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bachelors University</Label>
                  <Input value={formData.bachelors_university} onChange={e => handleChange("bachelors_university", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bachelors Country</Label>
                  <Input value={formData.bachelors_country} onChange={e => handleChange("bachelors_country", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bachelors Graduation</Label>
                  <DatePicker id="intake-bach-grad" value={formData.bachelors_graduation_date} onChange={val => handleChange("bachelors_graduation_date", val)} placeholder="MM-DD-YYYY" className={cn("h-10", isLocked && "opacity-50 pointer-events-none")} />
                </div>
              </div>
            </div>

            {/* ═══ SECTION C: SKILLS ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-green-600">Skills</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Primary Skills *</Label>
                  <Textarea id="intake-primary_skills" value={formData.primary_skills} onChange={e => handleChange("primary_skills", e.target.value)} disabled={isLocked} required placeholder="e.g. Python, React, AWS, etc." className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.primary_skills && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.primary_skills && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.primary_skills}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Currently Learning</Label>
                  <Textarea value={formData.currently_learning} onChange={e => handleChange("currently_learning", e.target.value)} disabled={isLocked} placeholder="Skills you're actively learning" className="rounded-lg bg-neutral-50 min-h-[80px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Experienced Tools</Label>
                  <Textarea value={formData.experienced_tools} onChange={e => handleChange("experienced_tools", e.target.value)} disabled={isLocked} placeholder="Tools and software you've used" className="rounded-lg bg-neutral-50 min-h-[80px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Learning Tools</Label>
                  <Textarea value={formData.learning_tools} onChange={e => handleChange("learning_tools", e.target.value)} disabled={isLocked} placeholder="Tools you want to learn" className="rounded-lg bg-neutral-50 min-h-[80px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Non-Technical Skills</Label>
                  <Textarea value={formData.non_technical_skills} onChange={e => handleChange("non_technical_skills", e.target.value)} disabled={isLocked} placeholder="Leadership, communication, project management, etc." className="rounded-lg bg-neutral-50 min-h-[80px]" />
                </div>
              </div>
            </div>

            {/* ═══ SECTION D: WORK EXPERIENCE ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-orange-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-orange-600">Work Experience</h3>
              </div>

              {/* Yes/No gate */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Do you have any work experience (U.S. and/or International)? *</Label>
                <div id="intake-has_work_experience" className={cn("flex items-center gap-6 py-2.5 px-4 bg-neutral-50 rounded-lg border", errors.has_work_experience ? "border-destructive ring-1 ring-destructive/20" : "border-neutral-200")}>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.has_work_experience === "yes"} onChange={() => { handleChange("has_work_experience", "yes"); if (formData.experiences.length === 0) handleArrayAdd('experiences'); }} disabled={isLocked} required className="accent-primary h-4 w-4" /> Yes</label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.has_work_experience === "no"} onChange={() => handleChange("has_work_experience", "no")} disabled={isLocked} required className="accent-primary h-4 w-4" /> No</label>
                </div>
                {errors.has_work_experience && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.has_work_experience}</p>}
              </div>

              {formData.has_work_experience === "yes" && (
                <div className="space-y-4">
                  {formData.experiences.map((exp, idx) => (
                    <Card key={idx} className="border border-neutral-200 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => handleArrayRemove('experiences', idx)}
                        disabled={isLocked}
                        className="absolute top-2 right-2 p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>

                      <div className="grid gap-3 sm:grid-cols-2 pr-10">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Job Title</Label>
                          <Input value={exp.job_title} onChange={e => handleArrayChange('experiences', idx, 'job_title', e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Company</Label>
                          <Input value={exp.company_name} onChange={e => handleArrayChange('experiences', idx, 'company_name', e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs font-medium">Company Address</Label>
                          <Input value={exp.company_address} onChange={e => handleArrayChange('experiences', idx, 'company_address', e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Start Date</Label>
                          <DatePicker id={`exp-start-${idx}`} value={exp.start_date} onChange={val => handleArrayChange('experiences', idx, 'start_date', val)} placeholder="MM-DD-YYYY" className={cn("h-9", isLocked && "opacity-50 pointer-events-none")} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">End Date</Label>
                          <DatePicker id={`exp-end-${idx}`} value={exp.end_date} onChange={val => handleArrayChange('experiences', idx, 'end_date', val)} placeholder="MM-DD-YYYY (or leave blank if current)" className={cn("h-9", isLocked && "opacity-50 pointer-events-none")} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Job Type</Label>
                          <Select value={exp.job_type} onValueChange={v => handleArrayChange('experiences', idx, 'job_type', v)} disabled={isLocked}>
                            <SelectTrigger className="h-9 rounded-lg bg-neutral-50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_time">Full Time</SelectItem>
                              <SelectItem value="part_time">Part Time</SelectItem>
                              <SelectItem value="internship">Internship</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="freelance">Freelance</SelectItem>
                              <SelectItem value="c2c">C2C</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs font-medium">Responsibilities</Label>
                          <Textarea value={exp.responsibilities} onChange={e => handleArrayChange('experiences', idx, 'responsibilities', e.target.value)} disabled={isLocked} className="rounded-lg bg-neutral-50 min-h-[60px]" />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {!isLocked && (
                    <Button type="button" onClick={() => handleArrayAdd('experiences')} variant="outline" className="w-full h-10 border-dashed border-neutral-300">
                      <Plus className="h-4 w-4 mr-2" /> Add Another Work Experience
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* ═══ SECTION E: CERTIFICATIONS ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Award className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-red-600">Certifications & Credentials</h3>
              </div>

              {/* Yes/No gate */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Have you completed any professional certifications relevant to your career or skillset? *</Label>
                <div id="intake-has_certifications" className={cn("flex items-center gap-6 py-2.5 px-4 bg-neutral-50 rounded-lg border", errors.has_certifications ? "border-destructive ring-1 ring-destructive/20" : "border-neutral-200")}>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.has_certifications === "yes"} onChange={() => { handleChange("has_certifications", "yes"); if (formData.certifications.length === 0) handleArrayAdd('certifications'); }} disabled={isLocked} required className="accent-primary h-4 w-4" /> Yes</label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.has_certifications === "no"} onChange={() => handleChange("has_certifications", "no")} disabled={isLocked} required className="accent-primary h-4 w-4" /> No</label>
                </div>
                {errors.has_certifications && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.has_certifications}</p>}
              </div>

              {formData.has_certifications === "yes" && (
                <div className="space-y-4">
                  {formData.certifications.map((cert, idx) => (
                    <Card key={idx} className="border border-neutral-200 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => handleArrayRemove('certifications', idx)}
                        disabled={isLocked}
                        className="absolute top-2 right-2 p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>

                      <div className="grid gap-3 sm:grid-cols-2 pr-10">
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs font-medium">Certification Name</Label>
                          <Input value={cert.name} onChange={e => handleArrayChange('certifications', idx, 'name', e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Organization</Label>
                          <Input value={cert.organization} onChange={e => handleArrayChange('certifications', idx, 'organization', e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Issued Date</Label>
                          <DatePicker id={`cert-issued-${idx}`} value={cert.issued_date} onChange={val => handleArrayChange('certifications', idx, 'issued_date', val)} placeholder="MM-DD-YYYY" className={cn("h-9", isLocked && "opacity-50 pointer-events-none")} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Expires Date</Label>
                          <DatePicker id={`cert-expires-${idx}`} value={cert.expires_date || ''} onChange={val => handleArrayChange('certifications', idx, 'expires_date', val)} placeholder="MM-DD-YYYY (optional)" className={cn("h-9", isLocked && "opacity-50 pointer-events-none")} />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs font-medium">Credential URL</Label>
                          <div className="flex gap-2">
                            <Input type="url" value={cert.credential_url || ''} onChange={e => handleArrayChange('certifications', idx, 'credential_url', e.target.value)} disabled={isLocked} placeholder="https://..." className="h-9 rounded-lg bg-neutral-50 flex-1" />
                            {cert.credential_url && (
                              <DocumentPreview url={cert.credential_url} variant="icon" className="h-9 w-9" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {!isLocked && (
                    <Button type="button" onClick={() => handleArrayAdd('certifications')} variant="outline" className="w-full h-10 border-dashed border-neutral-300">
                      <Plus className="h-4 w-4 mr-2" /> Add Certification
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* ═══ SECTION F: WORK AUTHORIZATION ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600">Work Authorization</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Visa Type *</Label>
                  <Select value={formData.visa_type} onValueChange={v => handleChange("visa_type", v)} disabled={isLocked} required>
                    <SelectTrigger id="intake-visa_type" className={cn("h-10 rounded-lg bg-neutral-50", errors.visa_type && "border-destructive ring-1 ring-destructive/20")}><SelectValue placeholder="Select visa type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="F1-OPT">F1-OPT</SelectItem>
                      <SelectItem value="H1B">H1B</SelectItem>
                      <SelectItem value="H4 EAD">H4 EAD</SelectItem>
                      <SelectItem value="OPT">OPT</SelectItem>
                      <SelectItem value="CPT">CPT</SelectItem>
                      <SelectItem value="Green Card">Green Card</SelectItem>
                      <SelectItem value="US Citizen">US Citizen</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.visa_type && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.visa_type}</p>}
                </div>
                {formData.visa_type === "Other" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label className="text-sm font-medium">Please specify *</Label>
                    <Input id="intake-visa_type_other" value={formData.visa_type_other} onChange={e => handleChange("visa_type_other", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.visa_type_other && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.visa_type_other && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.visa_type_other}</p>}
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Visa Expiry Date</Label>
                  <DatePicker id="intake-visa-expiry" value={formData.visa_expiry_date} onChange={val => handleChange("visa_expiry_date", val)} placeholder="MM-DD-YYYY" className={cn("h-10", isLocked && "opacity-50 pointer-events-none")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Work Authorization Status *</Label>
                  <Select value={formData.work_authorization_status} onValueChange={v => handleChange("work_authorization_status", v)} disabled={isLocked}>
                    <SelectTrigger id="intake-work_authorization_status" className={cn("h-10 rounded-lg bg-neutral-50", errors.work_authorization_status && "border-destructive ring-1 ring-destructive/20")}><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Authorized">Authorized</SelectItem>
                      <SelectItem value="Requires Sponsorship">Requires Sponsorship</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.work_authorization_status && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.work_authorization_status}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sponsorship Required?</Label>
                  <div className="flex items-center gap-6 py-2.5 px-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.sponsorship_required === true} onChange={() => handleChange("sponsorship_required", true)} disabled={isLocked} className="accent-primary h-4 w-4" /> Yes</label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.sponsorship_required === false} onChange={() => handleChange("sponsorship_required", false)} disabled={isLocked} className="accent-primary h-4 w-4" /> No</label>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ SECTION G: PROFESSIONAL BACKGROUND ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600">Professional Background</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Years of Experience *</Label>
                  <Input id="intake-years_of_experience" type="number" value={formData.years_of_experience} onChange={e => handleChange("years_of_experience", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.years_of_experience && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.years_of_experience && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.years_of_experience}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Job Title</Label>
                  <Input value={formData.current_job_title} onChange={e => handleChange("current_job_title", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Recent Employer</Label>
                  <Input value={formData.recent_employer} onChange={e => handleChange("recent_employer", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">LinkedIn URL *</Label>
                  <Input id="intake-linkedin_url" type="url" value={formData.linkedin_url} onChange={e => handleChange("linkedin_url", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.linkedin_url && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.linkedin_url && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.linkedin_url}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">GitHub URL</Label>
                  <Input type="url" value={formData.github_url} onChange={e => handleChange("github_url", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Portfolio URL</Label>
                  <Input type="url" value={formData.portfolio_url} onChange={e => handleChange("portfolio_url", e.target.value)} disabled={isLocked} className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Resume Upload (PDF/DOCX) *</Label>
                  <div className={cn("p-6 border-2 border-dashed rounded-xl transition-all", formData.resume_url ? "bg-green-50 border-green-300" : "bg-neutral-50 border-neutral-300 hover:border-primary/40", errors.resume_url && "border-destructive bg-destructive/5")}>
                    {!isLocked && (
                      <Input id="intake-resume_url" type="file" onChange={(e) => handleFileUpload(e, 'resume_url')} disabled={isLocked} accept=".pdf,.doc,.docx" className={cn("mb-3 h-10 py-2 cursor-pointer", errors.resume_url && "border-destructive")} />
                    )}
                    {errors.resume_url && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.resume_url}</p>}
                    {formData.resume_url ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-green-700 font-bold flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" /> Resume successfully attached.
                        </p>
                        <DocumentPreview
                          url={formData.resume_url}
                          label="Download"
                          variant="button"
                          className="h-9 px-3 text-xs bg-white border-green-300 text-green-700 hover:bg-green-600 hover:text-white"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No resume uploaded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ SECTION H: JOB PREFERENCES ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <LayoutDashboard className="h-4 w-4 text-cyan-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-600">Job Preferences</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Desired Experience Level / Description *</Label>
                  <Textarea id="intake-desired_experience" value={formData.desired_experience} onChange={e => handleChange("desired_experience", e.target.value)} disabled={isLocked} required placeholder="e.g. Looking for a role focused on backend development with team leadership" className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.desired_experience && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.desired_experience && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.desired_experience}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Desired Years of Experience *</Label>
                  <Input id="intake-desired_years_of_experience" type="number" min="0" max="50" value={formData.desired_years_of_experience} onChange={e => handleChange("desired_years_of_experience", e.target.value)} disabled={isLocked} required placeholder="e.g. 3" className={cn("h-10 rounded-lg bg-neutral-50", errors.desired_years_of_experience && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.desired_years_of_experience && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.desired_years_of_experience}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Industry Preference *</Label>
                  <Input id="intake-industry_preference" value={formData.industry_preference} onChange={e => handleChange("industry_preference", e.target.value)} disabled={isLocked} required placeholder="e.g. FinTech, Healthcare, etc." className={cn("h-10 rounded-lg bg-neutral-50", errors.industry_preference && "border-destructive ring-1 ring-destructive/20")} />
                  {errors.industry_preference && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.industry_preference}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Shift Preference *</Label>
                  <Select value={formData.shift_preference} onValueChange={v => handleChange("shift_preference", v)} disabled={isLocked} required>
                    <SelectTrigger id="intake-shift_preference" className={cn("h-10 rounded-lg bg-neutral-50", errors.shift_preference && "border-destructive ring-1 ring-destructive/20")}><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning (9 AM - 5 PM)</SelectItem>
                      <SelectItem value="Evening">Evening (5 PM - 1 AM)</SelectItem>
                      <SelectItem value="Night">Night (1 AM - 9 AM)</SelectItem>
                      <SelectItem value="Flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.shift_preference && <p className="text-[10px] text-destructive mt-1 font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errors.shift_preference}</p>}
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Target Roles</Label>
                  <Input value={formData.target_roles} onChange={e => handleChange("target_roles", e.target.value)} disabled={isLocked} placeholder="e.g. Senior Software Engineer, Tech Lead" className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Preferred Locations</Label>
                  <Input value={formData.preferred_locations} onChange={e => handleChange("preferred_locations", e.target.value)} disabled={isLocked} placeholder="e.g. San Francisco, New York, Remote" className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Remote Preference</Label>
                  <Select value={formData.remote_preference} onValueChange={v => handleChange("remote_preference", v)} disabled={isLocked}>
                    <SelectTrigger className="h-10 rounded-lg bg-neutral-50"><SelectValue placeholder="Select preference" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="On-site">On-site</SelectItem>
                      <SelectItem value="Any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Salary Expectation (USD/Year)</Label>
                  <Input type="text" value={formData.salary_expectation} onChange={e => handleChange("salary_expectation", formatSalary(e.target.value))} disabled={isLocked} placeholder="e.g. 120,000" className="h-10 rounded-lg bg-neutral-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preferred Employment Type</Label>
                  <Select value={formData.preferred_employment_type} onValueChange={v => handleChange("preferred_employment_type", v)} disabled={isLocked}>
                    <SelectTrigger className="h-10 rounded-lg bg-neutral-50"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="C2C">C2C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ready to Start Date</Label>
                  <DatePicker id="intake-start-date" value={formData.ready_to_start_date} onChange={val => handleChange("ready_to_start_date", val)} placeholder="MM-DD-YYYY" className={cn("h-10", isLocked && "opacity-50 pointer-events-none")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Willing to Relocate?</Label>
                  <div className="flex items-center gap-6 py-2.5 px-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.relocation_preference === true} onChange={() => handleChange("relocation_preference", true)} disabled={isLocked} className="accent-primary h-4 w-4" /> Yes</label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm"><input type="radio" checked={formData.relocation_preference === false} onChange={() => handleChange("relocation_preference", false)} disabled={isLocked} className="accent-primary h-4 w-4" /> No</label>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ SECTION I: DOCUMENTS ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <FileCheck className="h-4 w-4 text-teal-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-teal-600">Identity & Legal Documents</h3>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Passport</Label>
                  <div className={cn("p-4 border-2 border-dashed rounded-lg transition-all text-center", formData.passport_url ? "bg-green-50 border-green-300" : "bg-neutral-50 border-neutral-300")}>
                    {!isLocked && (
                      <Input type="file" onChange={(e) => handleFileUpload(e, 'passport_url')} disabled={isLocked} accept={ALLOWED_FILE_TYPES.join(',')} className="mb-2 h-9 py-1 cursor-pointer" />
                    )}
                    {formData.passport_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileCheck className="h-6 w-6 text-green-600" />
                        <p className="text-xs font-bold text-green-700">Uploaded</p>
                        <DocumentPreview url={formData.passport_url} label="View" className="text-xs text-green-600 hover:underline" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">PDF, DOCX, or image</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Government ID</Label>
                  <div className={cn("p-4 border-2 border-dashed rounded-lg transition-all text-center", formData.government_id_url ? "bg-green-50 border-green-300" : "bg-neutral-50 border-neutral-300")}>
                    {!isLocked && (
                      <Input type="file" onChange={(e) => handleFileUpload(e, 'government_id_url')} disabled={isLocked} accept={ALLOWED_FILE_TYPES.join(',')} className="mb-2 h-9 py-1 cursor-pointer" />
                    )}
                    {formData.government_id_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileCheck className="h-6 w-6 text-green-600" />
                        <p className="text-xs font-bold text-green-700">Uploaded</p>
                        <DocumentPreview url={formData.government_id_url} label="View" className="text-xs text-green-600 hover:underline" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">PDF, DOCX, or image</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Visa Document</Label>
                  <div className={cn("p-4 border-2 border-dashed rounded-lg transition-all text-center", formData.visa_url ? "bg-green-50 border-green-300" : "bg-neutral-50 border-neutral-300")}>
                    {!isLocked && (
                      <Input type="file" onChange={(e) => handleFileUpload(e, 'visa_url')} disabled={isLocked} accept={ALLOWED_FILE_TYPES.join(',')} className="mb-2 h-9 py-1 cursor-pointer" />
                    )}
                    {formData.visa_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileCheck className="h-6 w-6 text-green-600" />
                        <p className="text-xs font-bold text-green-700">Uploaded</p>
                        <DocumentPreview url={formData.visa_url} label="View" className="text-xs text-green-600 hover:underline" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">PDF, DOCX, or image</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Work Authorization Document</Label>
                  <div className={cn("p-4 border-2 border-dashed rounded-lg transition-all text-center", formData.work_authorization_url ? "bg-green-50 border-green-300" : "bg-neutral-50 border-neutral-300")}>
                    {!isLocked && (
                      <Input type="file" onChange={(e) => handleFileUpload(e, 'work_authorization_url')} disabled={isLocked} accept={ALLOWED_FILE_TYPES.join(',')} className="mb-2 h-9 py-1 cursor-pointer" />
                    )}
                    {formData.work_authorization_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileCheck className="h-6 w-6 text-green-600" />
                        <p className="text-xs font-bold text-green-700">Uploaded</p>
                        <DocumentPreview url={formData.work_authorization_url} label="View" className="text-xs text-green-600 hover:underline" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">PDF, DOCX, or image</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <Label className="text-sm font-medium">Upload Any Additional Documents</Label>
                  <div className={cn("p-4 border-2 border-dashed rounded-lg transition-all text-center", formData.any_documents_url ? "bg-green-50 border-green-300" : "bg-neutral-50 border-neutral-300")}>
                    {!isLocked && (
                      <Input type="file" onChange={(e) => handleFileUpload(e, 'any_documents_url')} disabled={isLocked} accept={ALLOWED_FILE_TYPES.join(',')} className="mb-2 h-9 py-1 cursor-pointer" />
                    )}
                    {formData.any_documents_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileCheck className="h-6 w-6 text-green-600" />
                        <p className="text-xs font-bold text-green-700">Uploaded</p>
                        <DocumentPreview url={formData.any_documents_url} label="View" className="text-xs text-green-600 hover:underline" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Any additional document (PDF, DOCX, or image)</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ SECTION J: ADDITIONAL INFO ═══ */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-violet-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-violet-600">Additional Information</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Additional Notes</Label>
                  <Textarea value={formData.additional_notes} onChange={e => handleChange("additional_notes", e.target.value)} disabled={isLocked} placeholder="Any additional information you'd like to share..." className="rounded-lg bg-neutral-50 min-h-[100px]" />
                </div>
              </div>
            </div>

            {/* ═══ SUBMIT BUTTON ═══ */}
            {canSubmit && (
              <div className="pt-8 border-t border-neutral-200">
                <Button
                  onClick={handleSubmit}
                  type="submit"
                  className="w-full h-12 text-base font-bold transition-all duration-300 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2"><Lock className="h-5 w-5 animate-pulse" /> Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-2">Submit & Lock Intake Form <CheckCircle className="h-5 w-5" /></span>
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground mt-4 font-medium italic opacity-70">
                  ⚠️ Submitting this form will lock it for administrative review. Ensure all details are accurate before submitting.
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
