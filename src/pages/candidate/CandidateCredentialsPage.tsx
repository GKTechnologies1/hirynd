import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, filesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail, Calendar, MapPin, Phone, User, Globe, Lock, Eye, EyeOff, 
  Upload, FileText, CheckCircle, RotateCcw, AlertCircle, ChevronDown,
  CloudUpload, Trash2, History as HistoryIcon, Clock, Briefcase, Shield, KeyRound, Download, X
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";
import DocumentPreview from "@/components/dashboard/DocumentPreview";

// --- Constants & Types ---

const COUNTRY_CODES = [
  { code: "+1", country: "USA/Canada" },
  { code: "+91", country: "India" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "Australia" },
  { code: "+86", country: "China" },
];

interface FormData {
  timestamp: string;
  email: string;
  bachelors_grad_date: string;
  first_entry_us: string;
  masters_grad_date: string;
  opt_start_date: string;
  opt_offer_submitted: string;
  offer_letter_file: File | null | string;
  preferred_roles: string;
  preferred_locations: string;
  full_name: string;
  personal_email: string;
  country_code: string;
  phone_number: string;
  location: string;
  linkedin_id: string;
  linkedin_pass: string;
  indeed_id: string;
  indeed_pass: string;
  dice_id: string;
  dice_pass: string;
  monster_id: string;
  monster_pass: string;
  ziprecruiter_id: string;
  ziprecruiter_pass: string;
  other_platforms: string;
}

const INITIAL_STATE: FormData = {
  timestamp: new Date().toLocaleString(),
  email: "",
  bachelors_grad_date: "",
  first_entry_us: "",
  masters_grad_date: "",
  opt_start_date: "",
  opt_offer_submitted: "",
  offer_letter_file: null,
  preferred_roles: "",
  preferred_locations: "",
  full_name: "",
  personal_email: "",
  country_code: "+1",
  phone_number: "",
  location: "",
  linkedin_id: "",
  linkedin_pass: "",
  indeed_id: "",
  indeed_pass: "",
  dice_id: "",
  dice_pass: "",
  monster_id: "",
  monster_pass: "",
  ziprecruiter_id: "",
  ziprecruiter_pass: "",
  other_platforms: "",
};

const SENSITIVE_FIELDS = [
  "gmail_password", 
  "linkedin_password", 
  "indeed_password", 
  "dice_password", 
  "monster_password", 
  "ziprecruiter_password",
  "linkedin_pass",
  "indeed_pass",
  "dice_pass",
  "monster_pass",
  "ziprecruiter_pass"
];

const maskSensitive = (key: string, value: string) => {
  if (SENSITIVE_FIELDS.includes(key) && value) return "******** (Sensitive Data Masked)";
  return value;
};

// --- Sub-components ---

const FormField = ({ label, mandatory, children, error, icon: Icon, description }: any) => (
  <div className="space-y-2 group text-left">
    <div className="flex items-center gap-2 ml-1">
      {Icon && <Icon className="h-4 w-4 text-secondary/80" />}
      <Label className="text-sm font-semibold text-card-foreground/90 flex items-center">
        {label} {mandatory && <span className="text-destructive ml-1 font-bold">*</span>}
      </Label>
    </div>
    {description && <p className="text-[10px] text-muted-foreground font-medium ml-1">{description}</p>}
    <div className="relative">
      {children}
    </div>
    {error && <p className="text-[11px] font-bold text-destructive mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{error}</p>}
  </div>
);

const PasswordField = ({ value, onChange, placeholder, error, mandatory, label, icon: Icon }: any) => {
  const [show, setShow] = useState(false);
  return (
    <FormField label={label} mandatory={mandatory} error={error} icon={Icon}>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-11 rounded-xl bg-white border-amber-200 pr-10",
            error && "border-destructive ring-1 ring-destructive/20"
          )}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-secondary transition-colors p-2"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );
};

interface CandidateCredentialsPageProps {
  candidate?: any;
  onStatusChange?: () => void;
}

const CandidateCredentialsPage = ({ candidate, onStatusChange }: CandidateCredentialsPageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<any[]>([]);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const populateFormFromVersion = (version: any) => {
    const data = version.data;
    if (!data) return;
    
    // Extract phone parts if needed (e.g., "+1 1234567890")
    let country_code = "+1";
    let phone = data.phone_number || "";
    if (phone.startsWith("+")) {
      const parts = phone.split(" ");
      if (parts.length > 1) {
        country_code = parts[0];
        phone = parts.slice(1).join(" ");
      }
    }

    setFormData(prev => ({
      ...prev,
      ...data,
      country_code,
      phone_number: phone,
      offer_letter_file: data.offer_letter_url || null,
      timestamp: new Date(version.created_at).toLocaleString(),
    }));
  };

  const fetchVersions = async (cid: string) => {
    try {
      const res = await candidatesApi.getCredentials(cid);
      setVersions(res.data || []);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch credential versions", err);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const meRes = await candidatesApi.me();
        const cid = meRes.data.id;
        setCandidateId(cid);
        
        if (user?.email) {
          setFormData(prev => ({ ...prev, email: user.email }));
        }

        const versionsList = await fetchVersions(cid);
        if (versionsList.length > 0) {
          // Sort by version descending to get the latest first
          const sorted = [...versionsList].sort((a, b) => b.version - a.version);
          populateFormFromVersion(sorted[0]);
        }
      } catch (err) {
        console.error("Initialization failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [user]);

  const validate = () => {
    const newErrors: any = {};
    const mandatoryFields: (keyof FormData)[] = [
      "email", "bachelors_grad_date", "first_entry_us", "masters_grad_date",
      "opt_start_date", "opt_offer_submitted", "preferred_roles",
      "preferred_locations", "full_name", "personal_email", "phone_number",
      "location", "linkedin_id", "linkedin_pass", "indeed_id", "indeed_pass",
      "dice_id", "dice_pass", "monster_id", "monster_pass", "ziprecruiter_id",
      "ziprecruiter_pass", "other_platforms"
    ];

    mandatoryFields.forEach(field => {
      if (!formData[field] && field !== "offer_letter_file") {
        newErrors[field] = "Required";
      }
    });

    if (formData.opt_offer_submitted === "yes" && !formData.offer_letter_file) {
      newErrors.offer_letter_file = "Offer letter required";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) newErrors.email = "Invalid format";
    if (formData.personal_email && !emailRegex.test(formData.personal_email)) newErrors.personal_email = "Invalid format";

    // Password validation (min 8)
    const passFields: (keyof FormData)[] = ["linkedin_pass", "indeed_pass", "dice_pass", "monster_pass", "ziprecruiter_pass"];
    passFields.forEach(field => {
      if (formData[field] && formData[field].toString().length < 8) {
        newErrors[field] = "Minimum 8 characters";
      }
    });

    // Phone validation
    if (formData.phone_number && !/^\d+$/.test(formData.phone_number)) {
      newErrors.phone_number = "Must be numeric";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all mandatory fields correctly."
      });
      return;
    }
    if (!candidateId) {
      toast({ variant: "destructive", title: "Error", description: "Could not identify account. Please refresh." });
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Upload offer letter file if provided
      let offerLetterUrl = typeof formData.offer_letter_file === "string" ? formData.offer_letter_file : "";
      if (formData.opt_offer_submitted === "yes" && formData.offer_letter_file instanceof File) {
        setUploadProgress(`Uploading ${formData.offer_letter_file.name}...`);
        const res = await filesApi.upload(formData.offer_letter_file, "offer_letter");
        offerLetterUrl = res.data.url;
        setUploadProgress("");
      }

      // Step 2: Build payload with correct backend field names
      const payload: Record<string, any> = {
        // Timeline & Education
        email: formData.email,
        bachelors_grad_date: formData.bachelors_grad_date,
        first_entry_us: formData.first_entry_us,
        masters_grad_date: formData.masters_grad_date,
        opt_start_date: formData.opt_start_date,
        opt_offer_submitted: formData.opt_offer_submitted,
        offer_letter_url: offerLetterUrl || undefined,
        // Personal info
        full_name: formData.full_name,
        personal_email: formData.personal_email,
        phone_number: `${formData.country_code} ${formData.phone_number}`.trim(),
        location: formData.location,
        preferred_roles: formData.preferred_roles,
        preferred_locations: formData.preferred_locations,
        // Platform credentials
        linkedin_id: formData.linkedin_id,
        linkedin_pass: formData.linkedin_pass,
        indeed_id: formData.indeed_id,
        indeed_pass: formData.indeed_pass,
        dice_id: formData.dice_id,
        dice_pass: formData.dice_pass,
        monster_id: formData.monster_id,
        monster_pass: formData.monster_pass,
        ziprecruiter_id: formData.ziprecruiter_id,
        ziprecruiter_pass: formData.ziprecruiter_pass,
        other_platforms: formData.other_platforms,
        // Metadata
        submitted_timestamp: new Date().toLocaleString(),
      };

      // Step 3: Submit to backend
      await candidatesApi.upsertCredential(candidateId, payload);
      const updatedVersions = await fetchVersions(candidateId);
      
      setIsEditing(false);
      if (updatedVersions.length > 0) {
        const sorted = [...updatedVersions].sort((a, b) => b.version - a.version);
        populateFormFromVersion(sorted[0]);
      }

      toast({
        title: "✅ Credentials Submitted!",
        description: "Your credential sheet has been saved successfully."
      });
      onStatusChange?.();
    } catch (err: any) {
      const detail = err?.response?.data?.validation_errors
        ? Object.values(err.response.data.validation_errors).join(", ")
        : err?.response?.data?.error || "An error occurred. Please try again.";
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: detail
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  const latestVersion = versions[0];
  const hasSubmission = versions.length > 0;
  const isLocked = hasSubmission && !isEditing;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-muted border-t-secondary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Loading Credentials...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Current Version Bar Info */}
      {latestVersion && (
        <Card className="border-none shadow-lg shadow-neutral-100/50 bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden ring-1 ring-neutral-200/50">
          <CardContent className="flex flex-col sm:flex-row items-center gap-5 p-5 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 border border-secondary/10">
              <HistoryIcon className="h-6 w-6 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Current Version {latestVersion.version}</p>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Last updated on {new Date(latestVersion.created_at).toLocaleString()}
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

      {/* Locked Read-Only State View */}
      {isLocked && latestVersion?.data && (
        <Card className="border-none shadow-xl shadow-neutral-200/50 rounded-2xl overflow-hidden text-left">
          <CardHeader className="bg-green-50 border-b border-green-100 pb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                  <Lock className="h-6 w-6 text-green-600" /> Credential Intake — Submitted
                </CardTitle>
                <CardDescription className="text-sm font-medium text-green-700">
                  Your credentials have been submitted and locked. Click "Update Credentials" to make changes (creates a new version).
                </CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-bold h-8 px-4 rounded-full gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Locked
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-10 px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "full_name", label: "Full Name" },
                { key: "personal_email", label: "Personal Email Address" },
                { key: "phone_number", label: "Mobile Phone Number" },
                { key: "location", label: "Location (City, State)" },
                { key: "bachelors_grad_date", label: "Bachelors Graduation Date" },
                { key: "masters_grad_date", label: "Masters Graduation Date" },
                { key: "first_entry_us", label: "First Entry into the U.S." },
                { key: "opt_start_date", label: "OPT Start Date" },
                { key: "opt_offer_submitted", label: "Is OPT Offer Submitted?" },
                { key: "offer_letter_url", label: "OPT Offer Letter" },
                { key: "preferred_roles", label: "Preferred Job Roles" },
                { key: "preferred_locations", label: "Preferred Location(s)" },
                { key: "linkedin_id", label: "LinkedIn Login ID" },
                { key: "linkedin_pass", label: "LinkedIn Password" },
                { key: "indeed_id", label: "Indeed Login ID" },
                { key: "indeed_pass", label: "Indeed Password" },
                { key: "dice_id", label: "Dice Login ID" },
                { key: "dice_pass", label: "Dice Password" },
                { key: "monster_id", label: "Monster Login ID" },
                { key: "monster_pass", label: "Monster Password" },
                { key: "ziprecruiter_id", label: "ZipRecruiter Login ID" },
                { key: "ziprecruiter_pass", label: "ZipRecruiter Password" },
                { key: "other_platforms", label: "Other Platform accounts" },
              ].map((item) => {
                const key = item.key;
                const value = latestVersion.data[key] || (key === "offer_letter_url" ? latestVersion.data.opt_offer_letter_url : null);
                if (!value) return null;

                const isSensitive = SENSITIVE_FIELDS.includes(key);
                const isUrl = (key.includes('url') || key.includes('file')) && typeof value === 'string';

                return (
                  <div key={key} className={cn(
                    "p-3 rounded-xl bg-neutral-50/50 border border-neutral-100 shadow-sm transition-all hover:bg-neutral-50 text-left",
                    ["full_name", "location", "preferred_roles", "preferred_locations", "other_platforms"].includes(key) ? "sm:col-span-2" : ""
                  )}>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1 opacity-70">
                      {item.label}
                    </span>
                    <div className="text-sm font-semibold text-foreground break-words flex items-center gap-2">
                      {isSensitive ? (
                        <span className="text-muted-foreground/60 font-mono tracking-tighter flex items-center gap-1.5">
                          <Lock className="h-3 w-3" /> ••••••••••
                        </span>
                      ) : isUrl ? (
                        <DocumentPreview 
                          url={value} 
                          label="View Attached File" 
                          className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1.5 transition-colors font-bold text-xs" 
                        />
                      ) : (
                        <span className="leading-relaxed">{String(value)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editable Form Card — Shown when fresh or editing */}
      {!isLocked && (
        <Card className="border-none shadow-xl shadow-neutral-200/50 rounded-2xl overflow-hidden text-left">
          <CardHeader className="bg-primary/5 border-b border-primary/10 pb-6 text-left">
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
            <form onSubmit={handleSubmit} className="space-y-12">
              
              {/* Section 1: Timeline & Education */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600">Timeline & Education</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <FormField label="Email Address" mandatory error={errors.email}>
                    <Input 
                      value={formData.email} 
                      onChange={e => handleChange("email", e.target.value)}
                      placeholder="official@email.com"
                      className={cn("h-10 rounded-lg bg-neutral-50", errors.email && "border-destructive ring-1 ring-destructive/20")}
                    />
                  </FormField>

                  <FormField label="Bachelors Graduation Date" mandatory error={errors.bachelors_grad_date}>
                    <DatePicker 
                      value={formData.bachelors_grad_date} 
                      onChange={v => handleChange("bachelors_grad_date", v)} 
                      placeholder="Select Date"
                    />
                  </FormField>

                  <FormField label="First Entry into the U.S." mandatory error={errors.first_entry_us}>
                    <DatePicker 
                      value={formData.first_entry_us} 
                      onChange={v => handleChange("first_entry_us", v)} 
                      placeholder="Select Date"
                    />
                  </FormField>

                  <FormField label="Masters Graduation Date" mandatory error={errors.masters_grad_date}>
                    <DatePicker 
                      value={formData.masters_grad_date} 
                      onChange={v => handleChange("masters_grad_date", v)} 
                      placeholder="Select Date"
                    />
                  </FormField>

                  <FormField label="OPT Start Date" mandatory error={errors.opt_start_date}>
                    <DatePicker 
                      value={formData.opt_start_date} 
                      onChange={v => handleChange("opt_start_date", v)} 
                      placeholder="Select Date"
                    />
                  </FormField>

                  <FormField label="Is OPT Offer Submitted?" mandatory error={errors.opt_offer_submitted}>
                    <Select value={formData.opt_offer_submitted} onValueChange={v => handleChange("opt_offer_submitted", v)}>
                      <SelectTrigger className={cn("h-10 rounded-lg bg-neutral-50", errors.opt_offer_submitted && "border-destructive ring-1 ring-destructive/20")}>
                        <SelectValue placeholder="Select Response" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  {formData.opt_offer_submitted === "yes" && (
                    <div className="sm:col-span-2 p-5 border-2 border-dashed rounded-lg bg-neutral-50 border-neutral-300 hover:border-primary/40 transition-all text-center">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={e => handleChange("offer_letter_file", e.target.files?.[0])}
                        accept=".pdf,.doc,.docx"
                      />
                      <FormField label="Upload OPT Offer Letter" mandatory error={errors.offer_letter_file}>
                        <div className="flex flex-col items-center gap-2 mt-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => fileInputRef.current?.click()} 
                            className="bg-white border-neutral-300"
                          >
                            <Upload className="h-4 w-4 mr-2" /> Choose Document File
                          </Button>
                          {formData.offer_letter_file ? (
                            <div className="flex items-center gap-1.5 mt-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-bold text-green-700">
                                {typeof formData.offer_letter_file === "string" 
                                  ? "Previously uploaded offer letter" 
                                  : (formData.offer_letter_file as File).name}
                              </span>
                              {typeof formData.offer_letter_file === "string" && (
                                <DocumentPreview 
                                  url={formData.offer_letter_file} 
                                  label="Preview" 
                                  className="text-xs font-semibold text-green-700 hover:underline ml-1" 
                                />
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-1">PDF, DOC, DOCX up to 5MB</p>
                          )}
                        </div>
                      </FormField>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Personal Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-green-600">Personal Information</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <FormField label="Full Name" mandatory error={errors.full_name}>
                    <Input value={formData.full_name} onChange={e => handleChange("full_name", e.target.value)} placeholder="As per legal documents" className={cn("h-10 rounded-lg bg-neutral-50", errors.full_name && "border-destructive ring-1 ring-destructive/20")} />
                  </FormField>

                  <FormField label="Personal Email Address" mandatory error={errors.personal_email}>
                    <Input value={formData.personal_email} onChange={e => handleChange("personal_email", e.target.value)} placeholder="personal@email.com" className={cn("h-10 rounded-lg bg-neutral-50", errors.personal_email && "border-destructive ring-1 ring-destructive/20")} />
                  </FormField>

                  <FormField label="Mobile Phone Number" mandatory error={errors.phone_number}>
                    <div className="flex gap-2">
                      <Select value={formData.country_code} onValueChange={v => handleChange("country_code", v)}>
                        <SelectTrigger className="w-[100px] h-10 rounded-lg bg-neutral-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        value={formData.phone_number} 
                        onChange={e => handleChange("phone_number", e.target.value)} 
                        placeholder="1234567890" 
                        className={cn("flex-1 h-10 rounded-lg bg-neutral-50", errors.phone_number && "border-destructive ring-1 ring-destructive/20")}
                      />
                    </div>
                  </FormField>

                  <FormField label="Location (City, State)" mandatory error={errors.location}>
                    <Input value={formData.location} onChange={e => handleChange("location", e.target.value)} placeholder="e.g. New York, NY" className={cn("h-10 rounded-lg bg-neutral-50", errors.location && "border-destructive ring-1 ring-destructive/20")} />
                  </FormField>

                  <div className="sm:col-span-2">
                    <FormField label="Preferred Job Roles" mandatory error={errors.preferred_roles}>
                      <Input value={formData.preferred_roles} onChange={e => handleChange("preferred_roles", e.target.value)} placeholder="e.g. Software Engineer, Data Analyst" className={cn("h-10 rounded-lg bg-neutral-50", errors.preferred_roles && "border-destructive ring-1 ring-destructive/20")} />
                    </FormField>
                  </div>

                  <div className="sm:col-span-2">
                    <FormField label="Preferred Location(s)" mandatory error={errors.preferred_locations}>
                      <Input value={formData.preferred_locations} onChange={e => handleChange("preferred_locations", e.target.value)} placeholder="e.g. Remote, Austin, Seattle" className={cn("h-10 rounded-lg bg-neutral-50", errors.preferred_locations && "border-destructive ring-1 ring-destructive/20")} />
                    </FormField>
                  </div>
                </div>
              </div>

              {/* Section 3: Account Credentials */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 space-y-6 overflow-hidden text-left">
                <div className="flex items-center gap-3 border-b border-amber-200 pb-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-200 flex items-center justify-center">
                    <KeyRound className="h-4 w-4 text-amber-900" />
                  </div>
                  <h3 className="font-bold text-xs uppercase tracking-widest text-amber-900">Account Credentials</h3>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  
                  {/* LinkedIn */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">LinkedIn Login ID *</Label>
                    <Input value={formData.linkedin_id} onChange={e => handleChange("linkedin_id", e.target.value)} placeholder="LinkedIn username or email" className={cn("h-11 rounded-xl bg-white border-amber-200", errors.linkedin_id && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.linkedin_id && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold">{errors.linkedin_id}</p>}
                  </div>
                  <PasswordField label="LinkedIn Password" mandatory value={formData.linkedin_pass} onChange={(v: string) => handleChange("linkedin_pass", v)} error={errors.linkedin_pass} placeholder="Password" />

                  {/* Indeed */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Indeed Login ID *</Label>
                    <Input value={formData.indeed_id} onChange={e => handleChange("indeed_id", e.target.value)} placeholder="Indeed Email ID" className={cn("h-11 rounded-xl bg-white border-amber-200", errors.indeed_id && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.indeed_id && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold">{errors.indeed_id}</p>}
                  </div>
                  <PasswordField label="Indeed Password" mandatory value={formData.indeed_pass} onChange={(v: string) => handleChange("indeed_pass", v)} error={errors.indeed_pass} placeholder="Password" />

                  {/* Dice */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Dice Login ID *</Label>
                    <Input value={formData.dice_id} onChange={e => handleChange("dice_id", e.target.value)} placeholder="Dice username/email" className={cn("h-11 rounded-xl bg-white border-amber-200", errors.dice_id && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.dice_id && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold">{errors.dice_id}</p>}
                  </div>
                  <PasswordField label="Dice Password" mandatory value={formData.dice_pass} onChange={(v: string) => handleChange("dice_pass", v)} error={errors.dice_pass} placeholder="Password" />

                  {/* Monster */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Monster Login ID *</Label>
                    <Input value={formData.monster_id} onChange={e => handleChange("monster_id", e.target.value)} placeholder="Monster email" className={cn("h-11 rounded-xl bg-white border-amber-200", errors.monster_id && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.monster_id && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold">{errors.monster_id}</p>}
                  </div>
                  <PasswordField label="Monster Password" mandatory value={formData.monster_pass} onChange={(v: string) => handleChange("monster_pass", v)} error={errors.monster_pass} placeholder="Password" />

                  {/* ZipRecruiter */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">ZipRecruiter Login ID *</Label>
                    <Input value={formData.ziprecruiter_id} onChange={e => handleChange("ziprecruiter_id", e.target.value)} placeholder="ZipRecruiter email" className={cn("h-11 rounded-xl bg-white border-amber-200", errors.ziprecruiter_id && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.ziprecruiter_id && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold">{errors.ziprecruiter_id}</p>}
                  </div>
                  <PasswordField label="ZipRecruiter Password" mandatory value={formData.ziprecruiter_pass} onChange={(v: string) => handleChange("ziprecruiter_pass", v)} error={errors.ziprecruiter_pass} placeholder="Password" />

                  {/* Other Platforms */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Mention other Platform accounts *</Label>
                    <Textarea 
                      value={formData.other_platforms} 
                      onChange={e => handleChange("other_platforms", e.target.value)}
                      placeholder="Mention N/A if none."
                      className={cn("rounded-xl bg-white border-amber-200 min-h-[100px]", errors.other_platforms && "border-destructive")}
                    />
                    {errors.other_platforms && <p className="text-xs text-destructive mt-1.5 ml-1 font-semibold">{errors.other_platforms}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-8 border-t border-neutral-100">
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold transition-all rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none"
                  disabled={isSubmitting || !candidateId}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2"><Lock className="h-5 w-5 animate-pulse" /> Saving New Version...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {versions.length === 0 ? "Submit Marketing Credentials" : "Update Credentials (v" + (versions.length + 1) + ")"}
                      <CheckCircle className="h-5 w-5" />
                    </span>
                  )}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground mt-4 font-medium italic opacity-70 leading-relaxed">
                  Every update creates a historical record of your credentials. Administrative staff will use the latest version for marketing.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Version History Table (Bottom Accordion Card) */}
      {versions.length > 0 && (
        <Card className="border-none shadow-lg rounded-2xl bg-neutral-50/50 text-left">
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
                        <span className="font-bold text-sm block tracking-tight">Credentials Revision</span>
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
                          <div key={key} className="col-span-full border-b border-neutral-50 pb-3 last:border-0 text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1 opacity-60">
                              {key.replace(/_/g, " ")}:
                            </span>
                            <div className="text-foreground text-sm font-medium whitespace-pre-wrap leading-relaxed">
                              {(key.includes('url') || key.includes('file')) ? (
                                <DocumentPreview
                                  url={String(value)}
                                  label="View Attached File"
                                  className="text-blue-600 underline font-semibold cursor-pointer"
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
  );
};

export default CandidateCredentialsPage;
