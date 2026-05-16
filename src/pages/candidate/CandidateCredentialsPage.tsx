import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, filesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail, Calendar, MapPin, Phone, User, Globe, Lock, Eye, EyeOff, 
  Upload, FileText, CheckCircle, RotateCcw, AlertCircle, ChevronDown,
  CloudUpload, Trash2, History, Clock, Briefcase
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";

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
  offer_letter_file: File | null;
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

// --- Sub-components ---

const FormField = ({ label, mandatory, children, error, icon: Icon }: any) => (
  <div className="space-y-2.5 group">
    <div className="flex items-center gap-2.5 ml-1">
      {Icon && <Icon className="h-4.5 w-4.5 text-sky-500/80" />}
      <Label className="text-[13px] font-black text-slate-700/90 uppercase tracking-tight flex items-center">
        {label} {mandatory && <span className="text-rose-500 ml-1 font-bold">*</span>}
      </Label>
    </div>
    <div className="relative">
      {children}
    </div>
    {error && <p className="text-[11px] font-bold text-rose-500 mt-1.5 animate-in fade-in slide-in-from-top-1 ml-1">{error}</p>}
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
            "rounded-xl bg-white border-slate-200 h-14 font-medium focus:border-sky-400 focus:ring-sky-400/20 pr-12 transition-all shadow-sm",
            error && "border-rose-300 bg-rose-50/10"
          )}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 transition-colors p-2"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </FormField>
  );
};

const CandidateCredentialsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<any[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [sendCopy, setSendCopy] = useState(false);
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
          setActiveVersionId(sorted[0].id);
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
        newErrors[field] = "This field is required";
      }
    });

    if (formData.opt_offer_submitted === "yes" && !formData.offer_letter_file && !formData.opt_offer_submitted) {
       // if they already have one uploaded (we could check if versions already have it, but for now mandatory)
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) newErrors.email = "Invalid email format";
    if (formData.personal_email && !emailRegex.test(formData.personal_email)) newErrors.personal_email = "Invalid email format";

    // Password validation (min 8)
    const passFields: (keyof FormData)[] = ["linkedin_pass", "indeed_pass", "dice_pass", "monster_pass", "ziprecruiter_pass"];
    passFields.forEach(field => {
      if (formData[field] && formData[field].toString().length < 8) {
        newErrors[field] = "Minimum 8 characters required";
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

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all fields?")) {
      setFormData({
        ...INITIAL_STATE,
        email: user?.email || "",
        timestamp: new Date().toLocaleString()
      });
      setErrors({});
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
      toast({ variant: "destructive", title: "Error", description: "Could not identify your account. Please refresh." });
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Upload offer letter file if provided
      let offerLetterUrl = "";
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
        submitted_timestamp: formData.timestamp,
      };

      // Step 3: Submit to backend
      await candidatesApi.upsertCredential(candidateId, payload);
      await fetchVersions(candidateId);

      setIsSubmitted(true);
      toast({
        title: "✅ Credentials Submitted!",
        description: "Your credential sheet has been saved successfully."
      });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fbff] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Loading Credentials...</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f8fbff] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
        <Card className="max-w-2xl w-full border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-white">
          <div className="h-3 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />
          <CardContent className="p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="h-12 w-12 text-sky-500" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Submit Confirmation Page</h2>
              <div className="space-y-6 text-slate-600 font-medium leading-relaxed max-w-lg mx-auto">
                <p className="text-xl text-sky-600 font-bold">You’re one step away to get your application workflow started..!</p>
                <p>Our team will now start setting up your application workflow. Please stay in touch via your Hyrind email and WhatsApp for future updates.</p>
                <div className="pt-4 border-t border-slate-100">
                  <p className="italic text-slate-800 font-black">“Let’s build your future together.”</p>
                  <div className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
                    — Team Hyrind <br/>
                    <span className="text-[10px]">‘You focus on skills. We’ll handle the rest.’</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl flex items-center justify-center gap-3 border border-slate-100 max-w-md mx-auto">
              <Checkbox id="send-copy" checked={sendCopy} onCheckedChange={v => setSendCopy(!!v)} className="data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500" />
              <Label htmlFor="send-copy" className="text-sm font-bold text-slate-700 cursor-pointer">Send me a copy of my responses</Label>
            </div>

            <Button onClick={() => setIsSubmitted(false)} variant="outline" className="rounded-2xl h-14 px-8 border-slate-200 hover:bg-slate-50 font-bold text-slate-600 gap-2">
              <RotateCcw className="h-4 w-4" /> Edit/Update Responses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9ff] pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 h-[350px] w-full relative overflow-hidden flex items-center">
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[80%] bg-white/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[100%] bg-sky-400/20 rounded-full blur-[150px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        </div>
        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-xl rounded-full text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl border border-white/20">
                <Lock className="h-3.5 w-3.5 text-sky-300" /> Secure Credential Sheet
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
                Profile <span className="text-sky-300">Auth</span>
              </h1>
              <p className="text-sky-100/80 font-medium max-w-xl text-lg leading-relaxed">
                Manage your professional identity and platform access. High-security encrypted data management for your premium application workflow.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[2.5rem] text-white shadow-2xl min-w-[280px]">
              <div className="flex items-center gap-3 mb-2 opacity-60">
                <Clock className="h-4 w-4 text-sky-300" />
                <span className="text-[10px] font-black uppercase tracking-widest">Version Timestamp</span>
              </div>
              <div className="text-2xl font-black tabular-nums tracking-tight">
                {formData.timestamp || new Date().toLocaleString()}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-sky-200">
                <span>Status</span>
                <span className="bg-sky-400/20 px-2 py-1 rounded-md text-sky-300 border border-sky-400/30">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Version History */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] bg-white/90 backdrop-blur-xl sticky top-8 overflow-hidden">
              <div className="h-2 bg-sky-500 w-full" />
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center shadow-inner">
                    <History className="h-6 w-6 text-sky-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800 tracking-tight">History</CardTitle>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Past Submissions</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-2 space-y-3">
                {versions.length === 0 ? (
                  <div className="py-12 text-center px-4 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                    <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-400 leading-relaxed px-4">No previous credential versions found.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {versions.sort((a,b) => b.version - a.version).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          populateFormFromVersion(v);
                          setActiveVersionId(v.id);
                          toast({ title: `Loaded Version ${v.version}` });
                        }}
                        className={cn(
                          "w-full p-5 rounded-[1.5rem] text-left transition-all border-2 flex items-center justify-between group",
                          activeVersionId === v.id 
                            ? "bg-sky-50 border-sky-400 shadow-lg shadow-sky-100" 
                            : "bg-white border-slate-50 hover:border-sky-200 hover:bg-slate-50"
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tighter",
                              activeVersionId === v.id ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500"
                            )}>
                              VER {v.version}
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              {new Date(v.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold truncate max-w-[140px]">
                            {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <ChevronDown className={cn(
                          "h-5 w-5 transition-transform duration-300",
                          activeVersionId === v.id ? "text-sky-500 -rotate-90 scale-110" : "text-slate-200 group-hover:text-sky-400"
                        )} />
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="pt-6 mt-4 border-t border-slate-100 flex flex-col gap-3">
                  <Button 
                    type="button"
                    onClick={handleReset} 
                    variant="ghost" 
                    className="w-full rounded-2xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black text-xs gap-2 py-6 transition-all"
                  >
                    <RotateCcw className="h-4 w-4" /> Start Fresh Version
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-10 pb-40">
              {/* Section 1: Immigration & Education */}
              <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                <CardHeader className="bg-white border-b border-slate-50 p-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center shadow-inner">
                      <Calendar className="h-7 w-7 text-sky-600" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Timeline & Education</CardTitle>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Immigration and academic details</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 bg-white/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FormField label="Email Address" mandatory icon={Mail} error={errors.email}>
                      <Input 
                        value={formData.email} 
                        onChange={e => handleChange("email", e.target.value)}
                        placeholder="official@email.com"
                        className="rounded-xl border-slate-200 h-14 font-medium"
                      />
                    </FormField>

                    <FormField label="Bachelors Graduation Date" mandatory icon={Calendar} error={errors.bachelors_grad_date}>
                      <DatePicker 
                        value={formData.bachelors_grad_date} 
                        onChange={v => handleChange("bachelors_grad_date", v)} 
                        placeholder="Select Date"
                      />
                    </FormField>

                    <FormField label="First Entry into the U.S." mandatory icon={MapPin} error={errors.first_entry_us}>
                      <DatePicker 
                        value={formData.first_entry_us} 
                        onChange={v => handleChange("first_entry_us", v)} 
                        placeholder="DD/MM/YYYY"
                      />
                    </FormField>

                    <FormField label="Masters Graduation Date" mandatory icon={Calendar} error={errors.masters_grad_date}>
                      <DatePicker 
                        value={formData.masters_grad_date} 
                        onChange={v => handleChange("masters_grad_date", v)} 
                        placeholder="Select Date"
                      />
                    </FormField>

                    <FormField label="OPT Start Date" mandatory icon={Calendar} error={errors.opt_start_date}>
                      <DatePicker 
                        value={formData.opt_start_date} 
                        onChange={v => handleChange("opt_start_date", v)} 
                        placeholder="Select Date"
                      />
                    </FormField>

                    <FormField label="Is OPT Offer Submitted?" mandatory icon={Briefcase} error={errors.opt_offer_submitted}>
                      <Select value={formData.opt_offer_submitted} onValueChange={v => handleChange("opt_offer_submitted", v)}>
                        <SelectTrigger className="rounded-xl h-14 border-slate-200 bg-white font-bold text-slate-700">
                          <SelectValue placeholder="Select Response" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  {formData.opt_offer_submitted === "yes" && (
                    <div className="mt-8 p-8 rounded-[2rem] bg-sky-50/50 border border-sky-100 animate-in fade-in slide-in-from-top-4 duration-500">
                      <FormField label="Upload OPT Offer Letter" mandatory error={errors.offer_letter_file}>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer bg-white",
                            formData.offer_letter_file ? "border-emerald-400 bg-emerald-50/20" : "border-sky-200 hover:border-sky-500"
                          )}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={e => handleChange("offer_letter_file", e.target.files?.[0])}
                            accept=".pdf,.doc,.docx"
                          />
                          <div className="flex items-center justify-center gap-4">
                            <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center">
                              <Upload className="h-6 w-6 text-sky-600" />
                            </div>
                            <div className="text-left">
                              <p className="font-black text-slate-800">
                                {formData.offer_letter_file instanceof File ? formData.offer_letter_file.name : "Click to Upload Offer Letter"}
                              </p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">PDF, DOC, DOCX up to 5MB</p>
                            </div>
                          </div>
                        </div>
                      </FormField>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: Personal Information */}
              <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                <CardHeader className="bg-white border-b border-slate-50 p-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center shadow-inner">
                      <User className="h-7 w-7 text-sky-600" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Personal Information</CardTitle>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Direct contact and location details</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 bg-white/50 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField label="Full Name" mandatory icon={User} error={errors.full_name}>
                      <Input value={formData.full_name} onChange={e => handleChange("full_name", e.target.value)} placeholder="As per legal documents" className="rounded-xl h-14 font-medium" />
                    </FormField>

                    <FormField label="Personal Email Address" mandatory icon={Mail} error={errors.personal_email}>
                      <Input value={formData.personal_email} onChange={e => handleChange("personal_email", e.target.value)} placeholder="personal@email.com" className="rounded-xl h-14 font-medium" />
                    </FormField>

                    <FormField label="Mobile Phone Number" mandatory icon={Phone} error={errors.phone_number}>
                      <div className="flex gap-2">
                        <Select value={formData.country_code} onValueChange={v => handleChange("country_code", v)}>
                          <SelectTrigger className="w-[140px] rounded-xl h-14 border-slate-200 bg-white font-bold text-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                            {COUNTRY_CODES.map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.code} ({c.country})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input 
                          value={formData.phone_number} 
                          onChange={e => handleChange("phone_number", e.target.value)} 
                          placeholder="1234567890" 
                          className="flex-1 rounded-xl h-14 font-medium"
                        />
                      </div>
                    </FormField>

                    <FormField label="Location (City, State)" mandatory icon={MapPin} error={errors.location}>
                      <Input value={formData.location} onChange={e => handleChange("location", e.target.value)} placeholder="e.g. New York, NY" className="rounded-xl h-14 font-medium" />
                    </FormField>

                    <FormField label="Preferred Job Roles" mandatory icon={CheckCircle} error={errors.preferred_roles}>
                      <Input value={formData.preferred_roles} onChange={e => handleChange("preferred_roles", e.target.value)} placeholder="e.g. Software Engineer, Data Analyst" className="rounded-xl h-14 font-medium" />
                    </FormField>

                    <FormField label="Preferred Location(s)" mandatory icon={MapPin} error={errors.preferred_locations}>
                      <Input value={formData.preferred_locations} onChange={e => handleChange("preferred_locations", e.target.value)} placeholder="e.g. Remote, Austin, Seattle" className="rounded-xl h-14 font-medium" />
                    </FormField>
                  </div>
                </CardContent>
              </Card>

              {/* Section 3: Platform Credentials */}
              <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                <CardHeader className="bg-white border-b border-slate-50 p-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center shadow-inner">
                      <Lock className="h-7 w-7 text-sky-600" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Platform Auth</CardTitle>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Application portal access</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 bg-white/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                    {/* LinkedIn */}
                    <div className="space-y-6 p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-sky-900/5">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-[#0077B5] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-200">L</div>
                        <h4 className="font-black text-slate-800 text-lg">LinkedIn</h4>
                      </div>
                      <FormField label="Login ID" mandatory error={errors.linkedin_id}>
                        <Input value={formData.linkedin_id} onChange={v => handleChange("linkedin_id", v.target.value)} placeholder="Email/Username" className="rounded-xl h-14 border-slate-200" />
                      </FormField>
                      <PasswordField label="Password" mandatory value={formData.linkedin_pass} onChange={(v: string) => handleChange("linkedin_pass", v)} error={errors.linkedin_pass} placeholder="Enter Password" />
                    </div>

                    {/* Indeed */}
                    <div className="space-y-6 p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-sky-900/5">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-[#2164f3] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-200">I</div>
                        <h4 className="font-black text-slate-800 text-lg">Indeed</h4>
                      </div>
                      <FormField label="Login ID" mandatory error={errors.indeed_id}>
                        <Input value={formData.indeed_id} onChange={v => handleChange("indeed_id", v.target.value)} placeholder="Email" className="rounded-xl h-14 border-slate-200" />
                      </FormField>
                      <PasswordField label="Password" mandatory value={formData.indeed_pass} onChange={(v: string) => handleChange("indeed_pass", v)} error={errors.indeed_pass} placeholder="Enter Password" />
                    </div>

                    {/* Dice */}
                    <div className="space-y-6 p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-sky-900/5">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-[#e81c2b] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-red-200">D</div>
                        <h4 className="font-black text-slate-800 text-lg">Dice</h4>
                      </div>
                      <FormField label="Login ID" mandatory error={errors.dice_id}>
                        <Input value={formData.dice_id} onChange={v => handleChange("dice_id", v.target.value)} placeholder="Username" className="rounded-xl h-14 border-slate-200" />
                      </FormField>
                      <PasswordField label="Password" mandatory value={formData.dice_pass} onChange={(v: string) => handleChange("dice_pass", v)} error={errors.dice_pass} placeholder="Enter Password" />
                    </div>

                    {/* Monster */}
                    <div className="space-y-6 p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-sky-900/5">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-[#6d28d9] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-purple-200">M</div>
                        <h4 className="font-black text-slate-800 text-lg">Monster</h4>
                      </div>
                      <FormField label="Login ID" mandatory error={errors.monster_id}>
                        <Input value={formData.monster_id} onChange={v => handleChange("monster_id", v.target.value)} placeholder="Email" className="rounded-xl h-14 border-slate-200" />
                      </FormField>
                      <PasswordField label="Password" mandatory value={formData.monster_pass} onChange={(v: string) => handleChange("monster_pass", v)} error={errors.monster_pass} placeholder="Enter Password" />
                    </div>

                    {/* ZipRecruiter */}
                    <div className="space-y-6 p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-sky-900/5">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-[#00a83e] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-200">Z</div>
                        <h4 className="font-black text-slate-800 text-lg">ZipRecruiter</h4>
                      </div>
                      <FormField label="Login ID" mandatory error={errors.ziprecruiter_id}>
                        <Input value={formData.ziprecruiter_id} onChange={v => handleChange("ziprecruiter_id", v.target.value)} placeholder="Email" className="rounded-xl h-14 border-slate-200" />
                      </FormField>
                      <PasswordField label="Password" mandatory value={formData.ziprecruiter_pass} onChange={(v: string) => handleChange("ziprecruiter_pass", v)} error={errors.ziprecruiter_pass} placeholder="Enter Password" />
                    </div>

                    {/* Other Platforms */}
                    <div className="space-y-6 p-8 rounded-[2rem] bg-sky-50 border border-sky-100 shadow-sm transition-all hover:bg-white hover:shadow-xl hover:shadow-sky-900/5">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                        <h4 className="font-black text-slate-800 text-lg">Other Accounts</h4>
                      </div>
                      <FormField label="Mention all other Platform accounts" mandatory error={errors.other_platforms}>
                        <Textarea 
                          value={formData.other_platforms} 
                          onChange={e => handleChange("other_platforms", e.target.value)}
                          placeholder="Mention N/A if none."
                          className="rounded-2xl min-h-[140px] bg-white border-slate-200 font-medium"
                        />
                      </FormField>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sticky Action Bar */}
              <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-3xl border-t border-slate-100 p-6 z-[100] shadow-[0_-20px_80px_rgba(0,0,0,0.08)]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="hidden md:flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center shadow-inner">
                      <AlertCircle className="h-6 w-6 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                        Status: <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md text-[10px] uppercase">Reviewing Form</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        All mandatory fields (*) required
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <Button 
                      type="button" 
                      onClick={handleReset} 
                      variant="outline" 
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none h-14 px-10 rounded-2xl border-slate-200 hover:bg-slate-50 font-bold text-slate-600 gap-2 transition-all"
                    >
                      <RotateCcw className="h-4 w-4" /> Reset
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !candidateId}
                      className="flex-1 md:flex-none h-14 px-16 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black shadow-xl shadow-sky-200 hover:shadow-sky-300 active:scale-[0.98] transition-all gap-3 text-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                          {uploadProgress ? "Uploading..." : "Saving..."}
                        </>
                      ) : (
                        <>Submit Version <CheckCircle className="h-5 w-5" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateCredentialsPage;
