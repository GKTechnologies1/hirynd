import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format, parse } from "date-fns";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Clock, XCircle, Search } from "lucide-react";
import PasswordField from "@/components/auth/PasswordField";
import { DatePicker } from "@/components/ui/DatePicker";

const SOURCE_OPTIONS = ["LinkedIn", "Google", "University", "Friend", "Social Media", "Other"];
const VISA_OPTIONS = ["H1B", "OPT", "CPT", "Green Card", "US Citizen", "EAD", "TN", "Other"];

const CandidateLogin = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("+1");
  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Registration fields per spec Section 3.1
  const [reg, setReg] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    password: "", confirm_password: "",
    university_name: "",
    degree_major: "",
    graduation_date: "",
    how_did_you_hear: "", friend_name: "",
    linkedin_url: "", portfolio_url: "", github_url: "",
    visa_status: "", visa_other: "", opt_end_date: "",
    current_location: "", additional_notes: "",
    resume_file: null as File | null,
    consent_to_terms: false,
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const updateReg = (field: string, value: any) => {
    setReg(prev => ({ ...prev, [field]: value }));
    setRegErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validateRegistration = (): boolean => {
    const errors: Record<string, string> = {};
    if (!reg.first_name.trim()) errors.first_name = "First name is required";
    else if (/\d/.test(reg.first_name)) errors.first_name = "Numbers not allowed in first name";

    if (!reg.last_name.trim()) errors.last_name = "Last name is required";
    else if (/\d/.test(reg.last_name)) errors.last_name = "Numbers not allowed in last name";

    if (!reg.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email)) errors.email = "Enter a valid email address";

    if (!reg.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(reg.phone.replace(/\D/g, ''))) errors.phone = "Phone number must be exactly 10 digits";

    if (!reg.password) errors.password = "Password is required";
    else if (reg.password.length < 8) errors.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(reg.password))
      errors.password = "Must contain uppercase, lowercase, number, and special character";

    if (reg.password !== reg.confirm_password) errors.confirm_password = "Passwords do not match";

    if (!reg.university_name) errors.university_name = "University is required";
    if (!reg.degree_major) errors.degree_major = "Degree / Major is required";
    
    const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/;
    if (!reg.graduation_date) errors.graduation_date = "Graduation date is required";
    else if (!dateRegex.test(reg.graduation_date)) errors.graduation_date = "Use MM-DD-YYYY format";

    if (reg.visa_status === "OPT" && reg.opt_end_date && !dateRegex.test(reg.opt_end_date)) {
      errors.opt_end_date = "Use MM-DD-YYYY format";
    }

    if (!reg.how_did_you_hear) errors.how_did_you_hear = "This field is required";
    if (reg.how_did_you_hear === "Friend" && !reg.friend_name.trim()) errors.friend_name = "Friend name is required when source is Friend";
    
    if (!reg.visa_status) errors.visa_status = "Visa status is required";
    if (reg.visa_status === "Other" && !reg.visa_other.trim()) errors.visa_other = "Please specify your visa type";
    if (!reg.current_location.trim()) errors.current_location = "Current location is required";

    if (!reg.resume_file) {
      errors.resume_file = "Resume file is required";
    } else if (reg.resume_file.size > 5 * 1024 * 1024) {
      errors.resume_file = "File size must be less than 5MB";
    }

    if (!reg.consent_to_terms) errors.consent_to_terms = "You must agree to the Terms and Conditions";

    setRegErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstError = Object.keys(errors)[0];
      const element = document.getElementById(`reg-${firstError}`) || document.getElementsByName(firstError)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (element as HTMLElement).focus();
      }
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setApprovalStatus(null);
    const { error, approval_status, user: loggedUser } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      setSubmitting(false);
      if (approval_status === "pending") {
        setApprovalStatus("pending_approval");
      } else if (approval_status === "rejected") {
        setApprovalStatus("rejected");
      } else {
        const msg = typeof error === "string" ? error : (error.error || error.detail || "Invalid email or password.");
        toast({ title: "Login failed", description: msg, variant: "destructive" });
      }
    } else if (loggedUser?.role !== "candidate") {
      await signOut();
      setSubmitting(false);
      toast({ title: "Access denied", description: "This account is not registered as a candidate.", variant: "destructive" });
    } else {
      setSubmitting(false);
      navigate("/candidate-dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegistration()) return;
    setSubmitting(true);
    
    const data = new FormData();
    data.append("role", "candidate");
    data.append("first_name", reg.first_name.trim());
    data.append("last_name", reg.last_name.trim());
    data.append("email", reg.email.toLowerCase().trim());
    data.append("phone", `${countryCode} ${reg.phone.trim()}`);
    data.append("password", reg.password);
    data.append("confirm_password", reg.confirm_password);
    const [degree, ...majorParts] = reg.degree_major.split("/");
    const major = majorParts.join("/").trim();
    
    data.append("university_name", reg.university_name);
    data.append("degree", (degree || "").trim());
    data.append("major", major);
    const formattedGradDate = reg.graduation_date ? format(parse(reg.graduation_date, "MM-dd-yyyy", new Date()), "yyyy-MM-dd") : "";
    data.append("graduation_date", formattedGradDate);
    data.append("how_did_you_hear", reg.how_did_you_hear);
    data.append("friend_name", reg.friend_name);
    data.append("linkedin_url", reg.linkedin_url);
    data.append("portfolio_url", reg.portfolio_url);
    data.append("github_url", reg.github_url);
    data.append("visa_status", reg.visa_status === "Other" ? reg.visa_other : reg.visa_status);
    if (reg.opt_end_date) {
      const formattedOptDate = format(parse(reg.opt_end_date, "MM-dd-yyyy", new Date()), "yyyy-MM-dd");
      data.append("opt_end_date", formattedOptDate);
    }
    data.append("current_location", reg.current_location);
    data.append("additional_notes", reg.additional_notes);
    data.append("consent_to_terms", String(reg.consent_to_terms));

    if (reg.resume_file) {
      data.append("resume_file", reg.resume_file, reg.resume_file.name);
    }

    try {
      const { authApi } = await import("@/services/api");
      await authApi.register(data as any);
      
      await signOut();
      setRegistrationComplete(true);
      toast({ title: "Success", description: "Registration received! Check your email." });
    } catch (err: any) {
      let msg = "Something went wrong";
      const error = err.response?.data;
      if (typeof error === "string") {
        msg = error;
      } else if (error) {
        const firstKey = Object.keys(error)[0];
        if (firstKey) {
          const firstErr = error[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        }
      }
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (registrationComplete || approvalStatus === "pending_approval") {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
          <div className="mx-auto w-full max-w-md bg-white p-10 rounded-2xl border border-neutral-200 shadow-xl animate-in text-center">
            <div className="relative mb-8 flex justify-center">
              <div className="relative h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 shadow-sm">
                <Clock className="h-10 w-10 text-primary" />
              </div>
            </div>
            
            <h1 className="mb-3 text-2xl font-bold text-neutral-900 tracking-tight">Thank you for registering with Hyrind</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">Your registration has been received and is under review.</p>
            
            <div className="bg-muted/30 rounded-2xl p-6 mb-8 border border-border/40 inline-block w-full text-center">
              <p className="text-sm font-semibold text-foreground mb-2">Expected review time: <span className="text-primary">24–48 hours</span></p>
              <p className="text-xs text-muted-foreground">You will receive an email once your profile is approved.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button variant="hero" className="h-11 rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30" onClick={() => navigate("/")}>
                Back to Home
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Need help? <Link to="/contact" className="underline decoration-muted-foreground/30 hover:text-primary transition-colors">Contact Support</Link>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
          <div className="mx-auto w-full max-w-md bg-white p-10 rounded-2xl border border-neutral-200 shadow-xl animate-in text-center">
            <div className="relative mb-6 flex justify-center">
              <div className="relative h-16 w-16 bg-card rounded-full flex items-center justify-center border border-destructive/20 shadow-lg">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-destructive">Registration Not Approved</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Based on our current criteria, your Hyrind application was not approved at this time.
            </p>
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 mb-8 text-sm">
              If you believe this decision was made in error or wish to appeal, please contact our support team.
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/contact" className="inline-flex items-center justify-center h-11 rounded-xl bg-destructive text-white font-semibold shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-all active:scale-[0.98]">
                Contact Support
              </Link>
              <Button variant="ghost" className="h-11 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => setApprovalStatus(null)}>
                Back to Login
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isFormFilled = 
    reg.first_name.trim() !== "" &&
    reg.last_name.trim() !== "" &&
    reg.email.trim() !== "" &&
    reg.phone.trim() !== "" &&
    reg.password !== "" &&
    reg.password.length >= 8 &&
    reg.password === reg.confirm_password &&
    reg.university_name.trim() !== "" &&
    reg.degree_major.trim() !== "" &&
    reg.graduation_date !== "" &&
    reg.how_did_you_hear !== "" &&
    (reg.how_did_you_hear !== "Friend" || reg.friend_name.trim() !== "") &&
    reg.visa_status !== "" &&
    (reg.visa_status !== "Other" || reg.visa_other.trim() !== "") &&
    reg.current_location.trim() !== "" &&
    reg.resume_file !== null &&
    reg.consent_to_terms === true;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
        <div className="mx-auto w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-10 shadow-xl shadow-neutral-100/50">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2 tracking-tight">Candidate Portal</h1>
            <p className="text-muted-foreground italic">"Focus on your skills, let us handle the rest"</p>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-8 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
              <TabsTrigger value="login" className="rounded-lg py-2.5 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg py-2.5 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0 animate-in" style={{animationDelay: '0.1s'}}>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium ml-1">Email</Label>
                  <Input 
                    id="login-email"
                    type="email" 
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)} 
                    placeholder="name@example.com"
                    className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                    required 
                  />
                </div>
                <PasswordField 
                  label="Password" 
                  value={loginPassword} 
                  onChange={setLoginPassword} 
                  show={showLoginPassword} 
                  onToggle={() => setShowLoginPassword(!showLoginPassword)} 
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                />
                
                <div className="flex justify-end pr-1">
                  <Link 
                    to="/forgot-password?returnTo=/candidate-login" 
                    className="text-xs font-semibold text-primary hover:underline underline-offset-4 decoration-primary/30"
                  >
                    Forgot password?
                  </Link>
                </div>
                
                <div className="pt-2">
                  <Button 
                    variant="hero" 
                    className={`w-full h-12 rounded-xl text-md font-semibold transition-all ${loginEmail.trim() && loginPassword.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                    disabled={submitting}
                  >
                    {submitting ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0 animate-in" style={{animationDelay: '0.1s'}}>
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-6 max-h-[52vh] overflow-y-auto pr-2 custom-scrollbar py-1">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">First Name *</Label>
                      <Input 
                        id="reg-first_name"
                        value={reg.first_name} 
                        onChange={e => updateReg("first_name", e.target.value)} 
                        maxLength={60} 
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                      />
                      {regErrors.first_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.first_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">Last Name *</Label>
                      <Input 
                        id="reg-last_name"
                        value={reg.last_name} 
                        onChange={e => updateReg("last_name", e.target.value)} 
                        maxLength={60} 
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                      />
                      {regErrors.last_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.last_name}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Email *</Label>
                    <Input 
                      id="reg-email"
                      type="email" 
                      value={reg.email} 
                      onChange={e => updateReg("email", e.target.value)} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                    />
                    {regErrors.email && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-[100px] h-10 rounded-lg bg-neutral-50 border-neutral-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                          <SelectItem value="+91">🇮🇳 +91</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        id="reg-phone"
                        type="tel" 
                        value={reg.phone} 
                        onChange={e => updateReg("phone", e.target.value.replace(/\D/g, '').slice(0, 10))} 
                        placeholder="1234567890"
                        className="h-10 flex-1 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    {regErrors.phone && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.phone}</p>}
                  </div>
                  
                  <PasswordField 
                    label="Password *" 
                    value={reg.password} 
                    onChange={v => updateReg("password", v)} 
                    error={regErrors.password} 
                    id="reg-password"
                    className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                  />
                  
                  <PasswordField 
                    label="Confirm Password *" 
                    value={reg.confirm_password} 
                    onChange={v => updateReg("confirm_password", v)} 
                    error={regErrors.confirm_password} 
                    id="reg-confirm_password"
                    className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                  />
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">University / College *</Label>
                    <Input 
                      id="reg-university_name"
                      value={reg.university_name} 
                      onChange={e => updateReg("university_name", e.target.value)} 
                      maxLength={120} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                    />
                    {regErrors.university_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.university_name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Degree & Major *</Label>
                    <Input 
                      id="reg-degree_major"
                      value={reg.degree_major} 
                      onChange={e => updateReg("degree_major", e.target.value)} 
                      placeholder="e.g. Bachelors / Computer Science"
                      maxLength={250} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                    />
                    {regErrors.degree_major && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.degree_major}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Graduation Date *</Label>
                    <DatePicker 
                      id="reg-graduation_date"
                      value={reg.graduation_date} 
                      onChange={val => updateReg("graduation_date", val)} 
                      placeholder="MM-DD-YYYY"
                    />
                    {regErrors.graduation_date && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.graduation_date}</p>}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-neutral-100">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">How did you hear about us? *</Label>
                      <Select value={reg.how_did_you_hear} onValueChange={v => updateReg("how_did_you_hear", v)}>
                        <SelectTrigger id="reg-how_did_you_hear" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
                        <SelectContent>{SOURCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                      {regErrors.how_did_you_hear && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.how_did_you_hear}</p>}
                    </div>
                    
                    {reg.how_did_you_hear === "Friend" && (
                      <div className="space-y-2 animate-in slide-in-from-top-1">
                        <Label className="text-sm font-medium ml-1">Friend's Name *</Label>
                        <Input 
                          id="reg-friend_name"
                          value={reg.friend_name} 
                          onChange={e => updateReg("friend_name", e.target.value)} 
                          maxLength={120} 
                          className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                        />
                        {regErrors.friend_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.friend_name}</p>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-neutral-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-sm font-medium ml-1">LinkedIn URL</Label><Input id="reg-linkedin_url" type="url" value={reg.linkedin_url} onChange={e => updateReg("linkedin_url", e.target.value)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" /></div>
                      <div className="space-y-2"><Label className="text-sm font-medium ml-1">GitHub URL</Label><Input id="reg-github_url" type="url" value={reg.github_url} onChange={e => updateReg("github_url", e.target.value)} placeholder="https://github.com/..." className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" /></div>
                    </div>
                    
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">Portfolio / Website</Label><Input id="reg-portfolio_url" type="url" value={reg.portfolio_url} onChange={e => updateReg("portfolio_url", e.target.value)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" /></div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">Visa Status *</Label>
                      <Select value={reg.visa_status} onValueChange={v => updateReg("visa_status", v)}>
                        <SelectTrigger id="reg-visa_status" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"><SelectValue placeholder="Select visa type" /></SelectTrigger>
                        <SelectContent>{VISA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                      {regErrors.visa_status && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.visa_status}</p>}
                    </div>

                    {reg.visa_status === "Other" && (
                      <div className="space-y-2 animate-in slide-in-from-top-1">
                        <Label className="text-sm font-medium ml-1">Please Specify Visa Type *</Label>
                        <Input 
                          id="reg-visa_other"
                          value={reg.visa_other} 
                          onChange={e => updateReg("visa_other", e.target.value)} 
                          placeholder="Specify visa"
                          className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                        />
                        {regErrors.visa_other && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.visa_other}</p>}
                      </div>
                    )}

                    {reg.visa_status === "OPT" && (
                      <div className="space-y-2 animate-in slide-in-from-top-1">
                        <Label className="text-sm font-medium ml-1">OPT End Date</Label>
                        <DatePicker 
                          id="reg-opt_end_date"
                          value={reg.opt_end_date} 
                          onChange={val => updateReg("opt_end_date", val)} 
                          placeholder="MM-DD-YYYY"
                        />
                        {regErrors.opt_end_date && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.opt_end_date}</p>}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">Current Location *</Label>
                      <Input 
                        id="reg-current_location"
                        value={reg.current_location} 
                        onChange={e => updateReg("current_location", e.target.value)} 
                        placeholder="City, State, Country" 
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" 
                      />
                      {regErrors.current_location && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.current_location}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">Resume File (PDF/DOCX) *</Label>
                      <Input 
                        id="reg-resume_file"
                        type="file" 
                        accept=".pdf,.doc,.docx" 
                        onChange={e => updateReg("resume_file", e.target.files?.[0])}
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm py-1.5 px-2 text-xs" 
                      />
                      {regErrors.resume_file && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.resume_file}</p>}
                      <p className="text-[10px] text-muted-foreground ml-1">Max file size: 5MB</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">Additional Notes</Label>
                      <Input 
                        id="reg-additional_notes"
                        value={reg.additional_notes} 
                        onChange={e => updateReg("additional_notes", e.target.value)} 
                        placeholder="Anything else we should know?"
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-2 px-1">
                    <div className="flex items-start space-x-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200 shadow-sm transition-all hover:bg-white">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          id="consent_to_terms"
                          checked={reg.consent_to_terms}
                          onChange={e => updateReg("consent_to_terms", e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/20 accent-primary"
                        />
                      </div>
                      <Label htmlFor="consent_to_terms" className="text-xs text-muted-foreground leading-normal cursor-pointer select-none">
                        I hereby confirm that all information provided is accurate and I agree to HYRIND's{" "}
                        <Link to="/terms" target="_blank" className="font-bold text-[#0d47a1] hover:underline underline-offset-4">Terms & Conditions</Link>
                         {" "}and{" "}
                        <Link to="/privacy-policy" target="_blank" className="font-bold text-[#0d47a1] hover:underline underline-offset-4">Privacy Policy</Link>. *
                      </Label>
                    </div>
                    {regErrors.consent_to_terms && <p className="text-[10px] text-destructive mt-1 font-medium ml-2">{regErrors.consent_to_terms}</p>}
                  </div>

                </div>

                <div className="pt-3 pb-1 border-t border-neutral-100">
                  <Button 
                    variant="hero" 
                    className={`w-full h-12 rounded-xl text-md font-semibold transition-all ${isFormFilled ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`} 
                    disabled={submitting}
                  >
                    {submitting ? "Processing Registration..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
            <p className="text-sm text-neutral-500">
              Need assistance? <Link to="/contact?type=general" className="font-semibold text-secondary hover:underline underline-offset-4 decoration-secondary/30">Contact Support Team</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CandidateLogin;
