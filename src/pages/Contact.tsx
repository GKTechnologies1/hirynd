import { useState, useEffect, useCallback, memo } from "react";
import Header from "@/components/layout/Header";
import SEO from "@/components/SEO";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { authApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

const SERVICES = [
  "End-to-End Marketing Strategy",
  "Resume & Portfolio Optimization",
  "Technical Interview Prep",
  "Career Growth Counseling",
  "Visa & Compliance Support",
];

const Contact = () => {
  const [searchParams] = useSearchParams();
  const [wantsMarketing, setWantsMarketing] = useState<"yes" | "no" | null>(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "general") return "no";
    if (type === "interest") return "yes";
    return null;
  });
  const [referralSource, setReferralSource] = useState("");
  const [visaStatus, setVisaStatus] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const { toast } = useToast();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    university: "", graduation_year: "", degree_major: "",
    current_location: "", message: "", visa_other: "", referral_friend: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };


  const toggleService = useCallback((service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  }, []);

  const typeParam = searchParams.get("type");
  useEffect(() => {
    if (typeParam === "general" && wantsMarketing !== "no") {
      setWantsMarketing("no");
    } else if (typeParam === "interest" && wantsMarketing !== "yes") {
      setWantsMarketing("yes");
    }
  }, [typeParam, wantsMarketing]);

  const validateForm = (formData: FormData) => {
    const newErrors: Record<string, string> = {};
    
    const firstName = (formData.get("first_name") as string || "").trim();
    const lastName = (formData.get("last_name") as string || "").trim();
    const email = (formData.get("email") as string || "").trim();
    const phone = (formData.get("phone") as string || "").trim();

    if (!firstName) newErrors.first_name = "First name is required";
    else if (/\d/.test(firstName)) newErrors.first_name = "Numbers not allowed in first name";

    if (!lastName) newErrors.last_name = "Last name is required";
    else if (/\d/.test(lastName)) newErrors.last_name = "Numbers not allowed in last name";
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }
    
    if (!phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }
    
    if (wantsMarketing === "yes") {
      if (!formData.get("degree_major")) newErrors.degree_major = "Degree & Major is required";
      if (!formData.get("university")) newErrors.university = "University / College is required";
      if (!formData.get("graduation_year")) newErrors.graduation_year = "Graduation year is required";
      if (!visaStatus) newErrors.visa_status = "Please select your visa status";
      if (visaStatus === "other" && !(formData.get("visa_other") as string || "").trim()) {
        newErrors.visa_other = "Please specify your visa status";
      }
      if (!(formData.get("current_location") as string || "").trim()) newErrors.current_location = "Current location is required";
      if (!referralSource) newErrors.referral_source = "Please tell us how you heard about us";
      if (referralSource === "friend" && !(formData.get("referral_friend") as string || "").trim()) {
        newErrors.referral_friend = "Friend's name is required";
      }
      if (selectedServices.length === 0) {
        newErrors.services = "Please select at least one service";
      }
      
      const resume = formData.get("resume") as File;
      if (!resume || !resume.name) {
        newErrors.resume = "Resume file is required";
      } else if (resume.size > 5 * 1024 * 1024) {
        newErrors.resume = "File size must be less than 5MB";
      }

      if (!termsAccepted) newErrors.terms = "You must agree to the Terms and Conditions";
    } else {
      if (!(formData.get("message") as string || "").trim()) newErrors.message = "Message is required";
    }
    
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.keys(newErrors)[0];
      const element = document.getElementsByName(firstError)[0] || document.getElementById(`field-${firstError}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (element as HTMLElement).focus();
      }
      return false;
    }

    return true;
  };

  const isGeneralFilled = 
    formValues.first_name.trim() !== "" &&
    formValues.last_name.trim() !== "" &&
    formValues.email.trim() !== "" &&
    formValues.phone.trim() !== "" &&
    formValues.message.trim() !== "";

  const isInterestFilled = 
    formValues.first_name.trim() !== "" &&
    formValues.last_name.trim() !== "" &&
    formValues.email.trim() !== "" &&
    formValues.phone.trim() !== "" &&
    selectedServices.length > 0 &&
    formValues.degree_major.trim() !== "" &&
    formValues.university.trim() !== "" &&
    formValues.graduation_year.trim() !== "" &&
    visaStatus !== "" &&
    (visaStatus !== "other" || formValues.visa_other.trim() !== "") &&
    formValues.current_location.trim() !== "" &&
    referralSource !== "" &&
    (referralSource !== "friend" || formValues.referral_friend.trim() !== "") &&
    termsAccepted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formElement = e.target as HTMLFormElement;
    const formData = new FormData(formElement);
    
    if (!validateForm(formData)) {
      toast({ title: "Please fix the errors in the form.", variant: "destructive" });
      return;
    }
    
    const firstName = formValues.first_name;
    const lastName = formValues.last_name;
    const phoneNum = formValues.phone;
    
    // Construct final payload as FormData to support file upload
    const finalData = new FormData();
    finalData.append("name", `${firstName || ""} ${lastName || ""}`.trim());
    finalData.append("email", formValues.email);
    finalData.append("phone", `${countryCode} ${phoneNum}`.trim());
    finalData.append("mode", wantsMarketing === "yes" ? "interest" : "general");
    
    if (wantsMarketing === "yes") {
      finalData.append("university", formValues.university);
      const [degree, ...majorParts] = formValues.degree_major.split("&");
      finalData.append("degree", (degree || "").trim());
      finalData.append("major", majorParts.join("&").trim() || formValues.degree_major.trim());
      finalData.append("graduation_year", formValues.graduation_year);
      finalData.append("visa_status", visaStatus === "other" ? formValues.visa_other : visaStatus);
      finalData.append("current_location", formValues.current_location);
      finalData.append("referral_source", referralSource);
      finalData.append("referral_friend", formValues.referral_friend);
      finalData.append("services", JSON.stringify(selectedServices));
      
      const resumeFile = formData.get("resume") as File;
      if (resumeFile && resumeFile.name) {
        if (resumeFile.size > 5 * 1024 * 1024) {
          toast({ title: "File too large", description: "Resume must be less than 5MB.", variant: "destructive" });
          return;
        }
        finalData.append("resume", resumeFile);
      }
    } else {
      finalData.append("message", formValues.message);
    }

    try {
      await authApi.submitContact(finalData);
      
      // Reset form
      setFormValues({
        first_name: "", last_name: "", email: "", phone: "",
        university: "", graduation_year: "", degree_major: "",
        current_location: "", message: "", visa_other: "", referral_friend: ""
      });
      setShowSuccessDialog(true);
      setReferralSource("");
      setVisaStatus("");
      setSelectedServices([]);
      setTermsAccepted(false);
      setErrors({});
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.response?.data?.message || "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <SEO title="Contact Us" description="Reach out to HYRIND for questions, partnerships, or to submit your interest in our profile marketing and career support services." path="/contact" />
      <Header />
      <main className="flex-1">
        <section className="bg-white border-b border-neutral-200 pt-32 pb-16 lg:pt-40 lg:pb-24">
          <div className="container px-4 md:px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-[#0d47a1] sm:text-5xl">Contact Us</h1>
              <p className="mt-6 text-lg text-neutral-600">
                Reach out for questions, partnerships, or career support. Whether you're ready to get started or just want to learn more, we're here to help.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm lg:p-12 mb-12"
            >
              {/* Primary question */}
              {wantsMarketing === null && (
                <div className="text-center py-6">
                  <h2 className="mb-8 text-2xl font-bold text-neutral-900 tracking-tight">
                    Are you looking to get your profile marketed through HYRIND?
                  </h2>
                  <div className="flex justify-center gap-4">
                    <Button className="bg-[#0d47a1] text-white hover:bg-[#0d47a1]/90 rounded-xl h-12 px-8 text-base font-bold shadow-sm" onClick={() => setWantsMarketing("yes")}>Yes</Button>
                    <Button variant="outline" className="rounded-xl h-12 px-8 text-base font-bold text-neutral-600 border-neutral-200 hover:bg-neutral-50" onClick={() => setWantsMarketing("no")}>No</Button>
                  </div>
                </div>
              )}

              {/* General inquiry form */}
              {wantsMarketing === "no" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">General Inquiry</h2>
                    <p className="mt-2 text-sm text-neutral-500">Have a question about our services, partnerships, or anything else? Send us a message and we'll respond promptly.</p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">First Name *</Label>
                      <Input name="first_name" value={formValues.first_name} onChange={handleInputChange} placeholder="First name" className={`bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl h-11 ${errors.first_name ? 'border-destructive' : ''}`} />
                      {errors.first_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.first_name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Last Name *</Label>
                      <Input name="last_name" value={formValues.last_name} onChange={handleInputChange} placeholder="Last name" className={`bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl h-11 ${errors.last_name ? 'border-destructive' : ''}`} />
                      {errors.last_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.last_name}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Email *</Label>
                    <Input name="email" type="email" value={formValues.email} onChange={handleInputChange} placeholder="you@email.com" className={`bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl h-11 ${errors.email ? 'border-destructive' : ''}`} />
                    {errors.email && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Phone *</Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-[100px] bg-neutral-50/50 border-neutral-200 rounded-xl h-11 focus-visible:ring-[#0d47a1]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                          <SelectItem value="+91">🇮🇳 +91</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                          <SelectItem value="+61">🇦🇺 +61</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input name="phone" value={formValues.phone} onChange={handleInputChange} placeholder="(555) 000-0000" className={`flex-1 bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl h-11 ${errors.phone ? 'border-destructive' : ''}`} />
                    </div>
                    {errors.phone && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.phone}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Message *</Label>
                    <Textarea name="message" value={formValues.message} onChange={handleInputChange} placeholder="How can we help you?" rows={5} className={`bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl resize-none ${errors.message ? 'border-destructive' : ''}`} />
                    {errors.message && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.message}</p>}
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-neutral-100">
                    <Button 
                      type="submit" 
                      className={`rounded-xl h-11 px-6 font-bold shadow-sm transition-all ${isGeneralFilled ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-400 cursor-pointer'}`}
                    >
                      Send Message
                    </Button>
                    <Button variant="ghost" type="button" className="rounded-xl h-11 px-6 font-bold text-neutral-500 hover:text-neutral-900" onClick={() => { setWantsMarketing(null); setErrors({}); }}>Back</Button>
                  </div>
                </form>
              )}

              {/* Candidate interest form */}
              {wantsMarketing === "yes" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Candidate Interest Form</h2>
                    <p className="mt-2 text-sm text-neutral-500">Tell us about yourself so we can match you with the right recruiter and career strategy. All fields marked * are required.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">First Name *</Label>
                      <Input name="first_name" value={formValues.first_name} onChange={handleInputChange} placeholder="First name" className={`bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.first_name ? 'border-destructive' : ''}`} />
                      {errors.first_name && <p className="text-destructive text-[10px] mt-1 font-bold animate-in fade-in slide-in-from-top-1">{errors.first_name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Last Name *</Label>
                      <Input name="last_name" value={formValues.last_name} onChange={handleInputChange} placeholder="Last name" className={`bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.last_name ? 'border-destructive' : ''}`} />
                      {errors.last_name && <p className="text-destructive text-[10px] mt-1 font-bold animate-in fade-in slide-in-from-top-1">{errors.last_name}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Email *</Label>
                    <Input name="email" type="email" value={formValues.email} onChange={handleInputChange} placeholder="you@email.com" className={`bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.email ? 'border-destructive' : ''}`} />
                    {errors.email && <p className="text-destructive text-[10px] mt-1 font-bold animate-in fade-in slide-in-from-top-1">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Phone *</Label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="w-[100px] bg-neutral-50/50 border border-neutral-200 rounded-xl h-11 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d47a1]"
                      >
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                      </select>
                      <Input name="phone" value={formValues.phone} onChange={handleInputChange} placeholder="(555) 000-0000" className={`flex-1 bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.phone ? 'border-destructive' : ''}`} />
                    </div>
                    {errors.phone && <p className="text-destructive text-[10px] mt-1 font-bold animate-in fade-in slide-in-from-top-1">{errors.phone}</p>}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest text-[#0d47a1]">Select Services of Interest *</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SERVICES.map((s) => {
                        const isSelected = selectedServices.includes(s);
                        return (
                          <div 
                            key={s} 
                            onClick={() => toggleService(s)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#0d47a1] bg-blue-50/50 shadow-sm' : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/10'}`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${isSelected ? 'bg-[#0d47a1] border-[#0d47a1]' : 'border-neutral-300 bg-white'}`}
                            >
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-[11px] font-bold ${isSelected ? 'text-[#0d47a1]' : 'text-neutral-600'}`}>{s}</span>
                          </div>
                        );
                      })}
                    </div>
                    {errors.services && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.services}</p>}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">University / College *</Label>
                      <Input name="university" value={formValues.university} onChange={handleInputChange} placeholder="University name" className={`bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.university ? 'border-destructive' : ''}`} />
                      {errors.university && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.university}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Graduation Year *</Label>
                      <Input name="graduation_year" value={formValues.graduation_year} onChange={handleInputChange} placeholder="e.g., 2025" className={`bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.graduation_year ? 'border-destructive' : ''}`} />
                      {errors.graduation_year && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.graduation_year}</p>}
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Degree & Major *</Label>
                    <Input name="degree_major" value={formValues.degree_major} onChange={handleInputChange} placeholder="e.g., Master's in Computer Science" className={`h-11 rounded-xl bg-neutral-50/50 border-neutral-200 ${errors.degree_major ? 'border-destructive' : ''}`} />
                    {errors.degree_major && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.degree_major}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Visa Status *</Label>
                    <select
                      value={visaStatus}
                      onChange={e => { setVisaStatus(e.target.value); setErrors(prev => ({ ...prev, visa_status: "", visa_other: "" })); }}
                      className={`w-full bg-neutral-50/50 border rounded-xl h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d47a1] ${errors.visa_status ? 'border-destructive' : 'border-neutral-200'}`}
                    >
                      <option value="">Select your visa status</option>
                      <option value="us-citizen">US Citizen</option>
                      <option value="green-card">Green Card / Permanent Resident</option>
                      <option value="h1b">H-1B</option>
                      <option value="f1-opt">F-1 OPT</option>
                      <option value="f1-stem-opt">F-1 STEM OPT</option>
                      <option value="cpt">CPT</option>
                      <option value="ead">EAD</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.visa_status && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.visa_status}</p>}
                    {visaStatus === "other" && (
                      <div className="mt-3 space-y-1.5 animate-in slide-in-from-top-1">
                        <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Please Specify *</Label>
                        <Input name="visa_other" value={formValues.visa_other} onChange={handleInputChange} placeholder="Enter your visa status" className={`bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.visa_other ? 'border-destructive' : ''}`} />
                        {errors.visa_other && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.visa_other}</p>}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-neutral-400 font-medium">This helps us tailor our approach to your situation</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Current Location *</Label>
                    <Input name="current_location" value={formValues.current_location} onChange={handleInputChange} placeholder="City, State, Country" className={`bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.current_location ? 'border-destructive' : ''}`} />
                    {errors.current_location && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.current_location}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Resume Upload *</Label>
                    <Input name="resume" type="file" accept=".pdf,.doc,.docx" className={`file:rounded-lg file:border-0 file:bg-neutral-100 file:text-neutral-700 cursor-pointer pt-2 bg-neutral-50/50 border-neutral-200 rounded-xl h-11 file:mr-4 file:px-4 file:text-xs file:font-semibold ${errors.resume ? 'border-destructive' : ''}`} />
                    {errors.resume && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.resume}</p>}
                    <p className="mt-1 text-[10px] text-neutral-400 font-medium">PDF or Word document required</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">How did you hear about us? *</Label>
                    <select
                      value={referralSource}
                      onChange={e => { setReferralSource(e.target.value); setErrors(prev => ({ ...prev, referral_source: "" })); }}
                      className={`w-full bg-neutral-50/50 border rounded-xl h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d47a1] ${errors.referral_source ? 'border-destructive' : 'border-neutral-200'}`}
                    >
                      <option value="">Select source</option>
                      <option value="google">Google Search</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="instagram">Instagram</option>
                      <option value="friend">Referred by a Friend</option>
                      <option value="university">University / Career Center</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.referral_source && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.referral_source}</p>}
                  </div>
                  {referralSource === "friend" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Friend's Name *</Label>
                      <Input name="referral_friend" value={formValues.referral_friend} onChange={handleInputChange} placeholder="Who referred you to HYRIND?" className={`bg-neutral-50/50 border-neutral-200 rounded-xl h-11 ${errors.referral_friend ? 'border-destructive' : ''}`} />
                      {errors.referral_friend && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.referral_friend}</p>}
                    </div>
                  )}

                  {/* Terms & Privacy */}
                  <div className={`flex items-start gap-3 rounded-xl border p-5 mt-8 transition-colors ${errors.terms ? 'border-destructive bg-destructive/5' : 'border-neutral-200 bg-neutral-50'}`}>
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => { setTermsAccepted(checked === true); if (checked === true) setErrors(prev => ({ ...prev, terms: "" })); }}
                      className="mt-0.5 border-neutral-300 data-[state=checked]:bg-[#0d47a1] data-[state=checked]:text-white rounded"
                    />
                    <label htmlFor="terms" className="text-sm text-neutral-600 leading-relaxed font-medium">
                      I agree to HYRIND's{" "}
                      <Link to="/terms-and-conditions" target="_blank" className="font-bold text-[#0d47a1] hover:underline underline-offset-4">Terms & Conditions</Link>{" "}
                      and{" "}
                      <Link to="/privacy-policy" target="_blank" className="font-bold text-[#0d47a1] hover:underline underline-offset-4">Privacy Policy</Link>. *
                    </label>
                  </div>
                  {errors.terms && <p className="text-[10px] text-destructive mt-1 font-medium ml-2">{errors.terms}</p>}

                  <div className="flex gap-3 pt-4 border-t border-neutral-100">
                    <Button 
                      type="submit" 
                      className={`rounded-xl h-11 px-6 font-bold shadow-sm transition-all ${isInterestFilled ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-400 cursor-pointer'}`}
                    >
                      Submit Interest
                    </Button>
                    <Button variant="ghost" type="button" className="rounded-xl h-11 px-6 font-bold text-neutral-500 hover:text-neutral-900" onClick={() => { setWantsMarketing(null); setTermsAccepted(false); setErrors({}); }}>Back</Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </section>

        <Dialog open={showSuccessDialog} onOpenChange={(open) => {
          setShowSuccessDialog(open);
          if (!open) {
            setWantsMarketing(null);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl text-[#0d47a1]">
                Form Submitted Successfully!
              </DialogTitle>
              <DialogDescription className="text-neutral-600 mt-2">
                {wantsMarketing === "yes"
                  ? "Thank you for your interest! Our team will review your submission and reach out within 24–48 hours to schedule a discovery call."
                  : "Thank you for reaching out! We'll get back to you within 24–48 hours."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button onClick={() => {
                setShowSuccessDialog(false);
                setWantsMarketing(null);
              }} className="bg-[#0d47a1] text-white hover:bg-[#0d47a1]/90">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
