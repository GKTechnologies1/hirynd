import { useState, useEffect } from "react";
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

const Contact = () => {
  const [searchParams] = useSearchParams();
  const [wantsMarketing, setWantsMarketing] = useState<string | null>(null);
  const [referralSource, setReferralSource] = useState("");
  const [visaStatus, setVisaStatus] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "general") {
      setWantsMarketing("no");
    } else if (type === "interest") {
      setWantsMarketing("yes");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formElement = e.target as HTMLFormElement;
    const formData = new FormData(formElement);
    
    if (wantsMarketing === "yes") {
      if (!termsAccepted) {
        toast({ title: "Please accept the Terms & Conditions and Privacy Policy to continue.", variant: "destructive" });
        return;
      }
      if (!visaStatus) {
        toast({ title: "Please select your visa status.", variant: "destructive" });
        return;
      }
      if (!referralSource) {
        toast({ title: "Please select how you heard about us.", variant: "destructive" });
        return;
      }
    }
    
    const firstName = formData.get("first_name") as string;
    const lastName = formData.get("last_name") as string;
    const phoneNum = formData.get("phone") as string;
    
    // Construct final payload as FormData to support file upload
    const finalData = new FormData();
    finalData.append("name", `${firstName || ""} ${lastName || ""}`.trim());
    finalData.append("email", formData.get("email") as string);
    finalData.append("phone", `${countryCode} ${phoneNum}`.trim());
    finalData.append("mode", wantsMarketing === "yes" ? "interest" : "general");
    
    if (wantsMarketing === "yes") {
      finalData.append("university", formData.get("university") as string || "");
      finalData.append("graduation_year", formData.get("graduation_year") as string || "");
      finalData.append("degree_major", formData.get("degree_major") as string || "");
      finalData.append("visa_status", visaStatus);
      finalData.append("referral_source", referralSource);
      finalData.append("referral_friend", formData.get("referral_friend") as string || "");
      
      const resumeFile = formData.get("resume");
      if (resumeFile && (resumeFile as File).name) {
        finalData.append("resume", resumeFile);
      }
    } else {
      finalData.append("message", formData.get("message") as string || "");
    }

    try {
      await authApi.submitContact(finalData);
      
      // Reset form
      formElement.reset();
      setShowSuccessDialog(true);
      setReferralSource("");
      setVisaStatus("");
      setTermsAccepted(false);
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
                    <div className="space-y-1.5"><Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">First Name *</Label><Input name="first_name" required placeholder="First name" className="bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl h-11" /></div>
                    <div className="space-y-1.5"><Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Last Name *</Label><Input name="last_name" required placeholder="Last name" className="bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl h-11" /></div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Email *</Label><Input name="email" required type="email" placeholder="you@email.com" className="bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl h-11" /></div>
                  
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
                      <Input name="phone" required placeholder="(555) 000-0000" className="flex-1 bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl h-11" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5"><Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Message *</Label><Textarea name="message" required placeholder="How can we help you?" rows={5} className="bg-neutral-50/50 border-neutral-200 focus-visible:ring-[#0d47a1] shadow-sm rounded-xl resize-none" /></div>
                  <div className="flex gap-3 pt-4 border-t border-neutral-100">
                    <Button type="submit" className="bg-[#0d47a1] text-white hover:bg-[#0d47a1]/90 rounded-xl h-11 px-6 font-bold shadow-sm">Send Message</Button>
                    <Button variant="ghost" type="button" className="rounded-xl h-11 px-6 font-bold text-neutral-500 hover:text-neutral-900" onClick={() => setWantsMarketing(null)}>Back</Button>
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
                    <div className="space-y-1.5"><Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">First Name *</Label><Input name="first_name" required placeholder="First name" className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11" /></div>
                    <div className="space-y-1.5"><Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Last Name *</Label><Input name="last_name" required placeholder="Last name" className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11" /></div>
                  </div>
                  
                  <div className="space-y-1.5"><Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Email *</Label><Input name="email" required type="email" placeholder="you@email.com" className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11" /></div>
                  
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
                      <Input name="phone" required placeholder="(555) 000-0000" className="flex-1 bg-neutral-50/50 border-neutral-200 rounded-xl h-11" />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">University</Label>
                      <Input name="university" placeholder="University name (if applicable)" className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11" />
                      <p className="mt-1 text-[10px] text-neutral-400 font-medium">Leave blank if not applicable</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Graduation Year</Label>
                      <Input name="graduation_year" placeholder="e.g., 2025" className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11" />
                      <p className="mt-1 text-[10px] text-neutral-400 font-medium">Expected or completed graduation year</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Degree & Major *</Label>
                    <Input name="degree_major" required placeholder="e.g., Master's in Computer Science" className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Visa Status</Label>
                    <Select value={visaStatus} onValueChange={setVisaStatus}>
                      <SelectTrigger className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11"><SelectValue placeholder="Select your visa status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-citizen">US Citizen</SelectItem>
                        <SelectItem value="green-card">Green Card / Permanent Resident</SelectItem>
                        <SelectItem value="h1b">H-1B</SelectItem>
                        <SelectItem value="f1-opt">F-1 OPT</SelectItem>
                        <SelectItem value="f1-stem-opt">F-1 STEM OPT</SelectItem>
                        <SelectItem value="cpt">CPT</SelectItem>
                        <SelectItem value="ead">EAD</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[10px] text-neutral-400 font-medium">This helps us tailor our approach to your situation</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Resume Upload (Optional)</Label>
                    <Input name="resume" type="file" accept=".pdf,.doc,.docx" className="file:rounded-lg file:border-0 file:bg-neutral-100 file:text-neutral-700 cursor-pointer pt-2 bg-neutral-50/50 border-neutral-200 rounded-xl h-11 file:mr-4 file:px-4 file:text-xs file:font-semibold" />
                    <p className="mt-1 text-[10px] text-neutral-400 font-medium">PDF or Word document preferred</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">How did you hear about us?</Label>
                    <Select value={referralSource} onValueChange={setReferralSource}>
                      <SelectTrigger className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11"><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Search</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="friend">Referred by a Friend</SelectItem>
                        <SelectItem value="university">University / Career Center</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {referralSource === "friend" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Friend's Name</Label>
                      <Input name="referral_friend" placeholder="Who referred you to HYRIND?" className="bg-neutral-50/50 border-neutral-200 rounded-xl h-11" />
                    </div>
                  )}

                  {/* Terms & Privacy */}
                  <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-5 mt-8">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      className="mt-0.5 border-neutral-300 data-[state=checked]:bg-[#0d47a1] data-[state=checked]:text-white rounded"
                    />
                    <label htmlFor="terms" className="text-sm text-neutral-600 leading-relaxed font-medium">
                      I agree to HYRIND's{" "}
                      <Link to="/terms" className="font-bold text-[#0d47a1] hover:underline underline-offset-4">Terms & Conditions</Link>{" "}
                      and{" "}
                      <Link to="/privacy-policy" className="font-bold text-[#0d47a1] hover:underline underline-offset-4">Privacy Policy</Link>.
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100">
                    <Button type="submit" className="bg-[#0d47a1] text-white hover:bg-[#0d47a1]/90 rounded-xl h-11 px-6 font-bold shadow-sm">Submit Interest</Button>
                    <Button variant="ghost" type="button" className="rounded-xl h-11 px-6 font-bold text-neutral-500 hover:text-neutral-900" onClick={() => { setWantsMarketing(null); setTermsAccepted(false); }}>Back</Button>
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
