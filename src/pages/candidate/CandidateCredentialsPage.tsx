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
  CloudUpload, Trash2
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
  <div className="space-y-2 group">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-sky-500" />}
      <Label className="text-sm font-semibold text-slate-700 flex items-center">
        {label} {mandatory && <span className="text-rose-500 ml-1 font-bold">*</span>}
      </Label>
    </div>
    <div className="relative">
      {children}
    </div>
    {error && <p className="text-[11px] font-bold text-rose-500 mt-1 animate-in fade-in slide-in-from-top-1">{error}</p>}
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
            "rounded-xl bg-white border-slate-200 focus:border-sky-400 focus:ring-sky-400/20 pr-10 transition-all",
            error && "border-rose-300 bg-rose-50/10"
          )}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
  const [sendCopy, setSendCopy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
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
      if (!formData[field]) {
        newErrors[field] = "This field is required";
      }
    });

    if (formData.opt_offer_submitted === "yes" && !formData.offer_letter_file) {
      newErrors.offer_letter_file = "Offer letter is required";
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

    setIsSubmitting(true);
    try {
      // Simulation of submission
      await new Promise(r => setTimeout(r, 2000));
      
      setIsSubmitted(true);
      toast({
        title: "Success!",
        description: "Your Credential sheet has been submitted successfully."
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "An error occurred. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <RotateCcw className="h-4 w-4" /> Edit Responses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9ff] pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-sky-600 to-sky-700 h-[300px] w-full relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mb-48 blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em]">
                <Globe className="h-3 w-3" /> Professional Credential
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">Credential Sheet</h1>
              <p className="text-sky-100 font-medium max-w-xl">Please provide accurate information to initialize your professional application workflow.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-white min-w-[200px]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-200 mb-1">Generated At</p>
              <p className="text-lg font-black font-mono">{formData.timestamp}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-20">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Immigration & Education */}
          <Card className="border-none shadow-[0_20px_50px_rgba(15,23,42,0.05)] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-50 p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <Calendar className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">Timeline & Education</CardTitle>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Immigration and academic details</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FormField label="Email Address" mandatory icon={Mail} error={errors.email}>
                  <Input 
                    value={formData.email} 
                    onChange={e => handleChange("email", e.target.value)}
                    placeholder="official@email.com"
                    className="rounded-xl border-slate-200"
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

                <FormField label="OPT Offer Letter Submitted" mandatory icon={FileText} error={errors.opt_offer_submitted}>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {["yes", "no", "waiting"].map(val => (
                      <label key={val} className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all font-bold text-sm",
                        formData.opt_offer_submitted === val 
                          ? "bg-sky-50 border-sky-500 text-sky-700 shadow-sm" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                      )}>
                        <input 
                          type="radio" 
                          name="opt_offer" 
                          value={val} 
                          checked={formData.opt_offer_submitted === val}
                          onChange={() => handleChange("opt_offer_submitted", val)}
                          className="hidden"
                        />
                        <span className="capitalize">{val === "waiting" ? "Waiting for one" : val}</span>
                        {formData.opt_offer_submitted === val && <CheckCircle className="h-4 w-4" />}
                      </label>
                    ))}
                  </div>
                </FormField>
              </div>

              {/* Conditional File Upload */}
              {formData.opt_offer_submitted === "yes" && (
                <div className="mt-10 animate-in fade-in slide-in-from-top-4 duration-500">
                  <FormField label="Please Upload the Offer Letter Submitted" mandatory icon={Upload} error={errors.offer_letter_file}>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-[2rem] p-12 text-center transition-all cursor-pointer group relative overflow-hidden",
                        formData.offer_letter_file ? "bg-emerald-50/50 border-emerald-200" : "bg-sky-50/30 border-sky-200 hover:bg-sky-50/50 hover:border-sky-400",
                        errors.offer_letter_file && "bg-rose-50/30 border-rose-200"
                      )}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast({ variant: "destructive", title: "File too large", description: "Max size is 5MB" });
                              return;
                            }
                            handleChange("offer_letter_file", file);
                          }
                        }}
                      />
                      <div className="space-y-4 relative z-10">
                        <div className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110",
                          formData.offer_letter_file ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600"
                        )}>
                          {formData.offer_letter_file ? <CheckCircle className="h-10 w-10" /> : <CloudUpload className="h-10 w-10" />}
                        </div>
                        <div>
                          <p className="text-xl font-black text-slate-900">
                            {formData.offer_letter_file ? formData.offer_letter_file.name : "Drop or Click to Upload"}
                          </p>
                          <p className="text-sm text-slate-500 font-medium mt-1">Accepted: PDF, DOC, DOCX, PNG, JPG (Max 5MB)</p>
                        </div>
                        {formData.offer_letter_file && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="rounded-full gap-2 px-6 shadow-lg shadow-rose-200"
                            onClick={(e) => { e.stopPropagation(); handleChange("offer_letter_file", null); }}
                          >
                            <Trash2 className="h-4 w-4" /> Remove File
                          </Button>
                        )}
                      </div>
                    </div>
                  </FormField>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Personal Details */}
          <Card className="border-none shadow-[0_20px_50px_rgba(15,23,42,0.05)] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-50 p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <User className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">Personal Information</CardTitle>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Contact and preferences</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField label="Full Name" mandatory icon={User} error={errors.full_name}>
                  <Input value={formData.full_name} onChange={e => handleChange("full_name", e.target.value)} placeholder="Enter your full name" className="rounded-xl" />
                </FormField>

                <FormField label="Personal Email Address" mandatory icon={Mail} error={errors.personal_email}>
                  <Input value={formData.personal_email} onChange={e => handleChange("personal_email", e.target.value)} placeholder="personal@email.com" className="rounded-xl" />
                </FormField>

                <FormField label="Phone Number" mandatory icon={Phone} error={errors.phone_number}>
                  <div className="flex gap-3">
                    <Select value={formData.country_code} onValueChange={v => handleChange("country_code", v)}>
                      <SelectTrigger className="w-[120px] rounded-xl font-bold bg-slate-50 border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.code} ({c.country})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      value={formData.phone_number} 
                      onChange={e => handleChange("phone_number", e.target.value)} 
                      placeholder="1234567890" 
                      className="flex-1 rounded-xl"
                    />
                  </div>
                </FormField>

                <FormField label="Location (City, State)" mandatory icon={MapPin} error={errors.location}>
                  <Input value={formData.location} onChange={e => handleChange("location", e.target.value)} placeholder="e.g. New York, NY" className="rounded-xl" />
                </FormField>

                <FormField label="Preferred Job Roles for Marketing" mandatory icon={CheckCircle} error={errors.preferred_roles}>
                  <Input value={formData.preferred_roles} onChange={e => handleChange("preferred_roles", e.target.value)} placeholder="e.g. Software Engineer, Data Analyst" className="rounded-xl" />
                </FormField>

                <FormField label="Preferred Location(s)" mandatory icon={MapPin} error={errors.preferred_locations}>
                  <Input value={formData.preferred_locations} onChange={e => handleChange("preferred_locations", e.target.value)} placeholder="e.g. Remote, Austin, Seattle" className="rounded-xl" />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Platform Credentials */}
          <Card className="border-none shadow-[0_20px_50px_rgba(15,23,42,0.05)] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-50 p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <Lock className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">Job Platform Credentials</CardTitle>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Application portal access</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {/* LinkedIn */}
                <div className="space-y-6 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#0077B5] rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
                    <h4 className="font-black text-slate-800">LinkedIn</h4>
                  </div>
                  <FormField label="Login ID" mandatory error={errors.linkedin_id}>
                    <Input value={formData.linkedin_id} onChange={v => handleChange("linkedin_id", v.target.value)} placeholder="LinkedIn Email/Username" className="rounded-xl" />
                  </FormField>
                  <PasswordField label="Password" mandatory value={formData.linkedin_pass} onChange={(v: string) => handleChange("linkedin_pass", v)} error={errors.linkedin_pass} placeholder="Enter Password" />
                </div>

                {/* Indeed */}
                <div className="space-y-6 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#2164f3] rounded-lg flex items-center justify-center text-white font-bold text-sm">I</div>
                    <h4 className="font-black text-slate-800">Indeed</h4>
                  </div>
                  <FormField label="Login ID" mandatory error={errors.indeed_id}>
                    <Input value={formData.indeed_id} onChange={v => handleChange("indeed_id", v.target.value)} placeholder="Indeed Email" className="rounded-xl" />
                  </FormField>
                  <PasswordField label="Password" mandatory value={formData.indeed_pass} onChange={(v: string) => handleChange("indeed_pass", v)} error={errors.indeed_pass} placeholder="Enter Password" />
                </div>

                {/* Dice */}
                <div className="space-y-6 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#e81c2b] rounded-lg flex items-center justify-center text-white font-bold text-sm">D</div>
                    <h4 className="font-black text-slate-800">Dice</h4>
                  </div>
                  <FormField label="Login ID" mandatory error={errors.dice_id}>
                    <Input value={formData.dice_id} onChange={v => handleChange("dice_id", v.target.value)} placeholder="Dice Username" className="rounded-xl" />
                  </FormField>
                  <PasswordField label="Password" mandatory value={formData.dice_pass} onChange={(v: string) => handleChange("dice_pass", v)} error={errors.dice_pass} placeholder="Enter Password" />
                </div>

                {/* Monster */}
                <div className="space-y-6 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#6d28d9] rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
                    <h4 className="font-black text-slate-800">Monster</h4>
                  </div>
                  <FormField label="Login ID" mandatory error={errors.monster_id}>
                    <Input value={formData.monster_id} onChange={v => handleChange("monster_id", v.target.value)} placeholder="Monster Email" className="rounded-xl" />
                  </FormField>
                  <PasswordField label="Password" mandatory value={formData.monster_pass} onChange={(v: string) => handleChange("monster_pass", v)} error={errors.monster_pass} placeholder="Enter Password" />
                </div>

                {/* ZipRecruiter */}
                <div className="space-y-6 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#00a83e] rounded-lg flex items-center justify-center text-white font-bold text-sm">Z</div>
                    <h4 className="font-black text-slate-800">ZipRecruiter</h4>
                  </div>
                  <FormField label="Login ID" mandatory error={errors.ziprecruiter_id}>
                    <Input value={formData.ziprecruiter_id} onChange={v => handleChange("ziprecruiter_id", v.target.value)} placeholder="ZipRecruiter Email" className="rounded-xl" />
                  </FormField>
                  <PasswordField label="Password" mandatory value={formData.ziprecruiter_pass} onChange={(v: string) => handleChange("ziprecruiter_pass", v)} error={errors.ziprecruiter_pass} placeholder="Enter Password" />
                </div>

                {/* Other Platforms */}
                <div className="space-y-6 p-6 rounded-3xl bg-sky-50 border border-sky-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <h4 className="font-black text-slate-800">Other Accounts</h4>
                  </div>
                  <FormField label="Mention all other Job Platform accounts you have" mandatory error={errors.other_platforms}>
                    <Textarea 
                      value={formData.other_platforms} 
                      onChange={e => handleChange("other_platforms", e.target.value)}
                      placeholder="Mention N/A if you have no accounts with other job platforms."
                      className="rounded-xl min-h-[140px] bg-white"
                    />
                  </FormField>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="hidden md:block">
                <p className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-sky-500" />
                  All mandatory fields (*) must be completed before submission.
                </p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Button 
                  type="button" 
                  onClick={handleReset} 
                  variant="outline" 
                  className="flex-1 md:flex-none h-14 px-8 rounded-2xl border-slate-200 hover:bg-slate-50 font-bold text-slate-600 gap-2"
                >
                  <RotateCcw className="h-4 w-4" /> Reset Form
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 md:flex-none h-14 px-12 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black shadow-lg shadow-sky-200 hover:shadow-sky-300 active:scale-[0.98] transition-all gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>Submit Credential Sheet <CheckCircle className="h-5 w-5" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateCredentialsPage;
