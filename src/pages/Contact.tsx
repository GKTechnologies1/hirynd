import { useState } from "react";
import Header from "@/components/layout/Header";
import SEO from "@/components/SEO";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const [wantsMarketing, setWantsMarketing] = useState<string | null>(null);
  const [referralSource, setReferralSource] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wantsMarketing === "yes" && !termsAccepted) {
      toast({ title: "Please accept the Terms & Conditions and Privacy Policy to continue.", variant: "destructive" });
      return;
    }

    toast({
      title: "Form Submitted Successfully!",
      description: wantsMarketing === "yes"
        ? "Thank you for your interest! Our team will review your submission and reach out within 24–48 hours to schedule a discovery call."
        : "Thank you for reaching out! We'll get back to you within 24–48 hours.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Contact Us" description="Reach out to HYRIND for questions, partnerships, or to submit your interest in our profile marketing and career support services." path="/contact" />
      <Header />
      <main>
        <section className="hero-gradient py-20 lg:py-28">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold text-primary-foreground sm:text-5xl">Contact Us</h1>
              <p className="mt-6 text-lg text-primary-foreground/70">
                Reach out for questions, partnerships, or career support. Whether you're ready to get started or just want to learn more, we're here to help.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 card-elevated lg:p-10"
            >
              {/* Primary question */}
              {wantsMarketing === null && (
                <div className="text-center">
                  <h2 className="mb-6 text-xl font-semibold text-card-foreground">
                    Are you looking to get your profile marketed through HYRIND?
                  </h2>
                  <div className="flex justify-center gap-4">
                    <Button variant="hero" size="lg" onClick={() => setWantsMarketing("yes")}>Yes</Button>
                    <Button variant="outline" size="lg" onClick={() => setWantsMarketing("no")}>No</Button>
                  </div>
                </div>
              )}

              {/* General inquiry form */}
              {wantsMarketing === "no" && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="mb-4 text-xl font-semibold text-card-foreground">General Inquiry</h2>
                  <p className="mb-4 text-sm text-muted-foreground">Have a question about our services, partnerships, or anything else? Send us a message and we'll respond promptly.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label>Name *</Label><Input required placeholder="Your full name" /></div>
                    <div><Label>Email *</Label><Input required type="email" placeholder="you@email.com" /></div>
                  </div>
                  <div><Label>Phone</Label><Input placeholder="+1 (555) 000-0000" /></div>
                  <div><Label>Message *</Label><Textarea required placeholder="How can we help you?" rows={4} /></div>
                  <div className="flex gap-3">
                    <Button variant="hero" type="submit">Send Message</Button>
                    <Button variant="ghost" type="button" onClick={() => setWantsMarketing(null)}>Back</Button>
                  </div>
                </form>
              )}

              {/* Candidate interest form */}
              {wantsMarketing === "yes" && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="mb-2 text-xl font-semibold text-card-foreground">Candidate Interest Form</h2>
                  <p className="mb-4 text-sm text-muted-foreground">Tell us about yourself so we can match you with the right recruiter and career strategy. All fields marked * are required.</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label>Full Name *</Label><Input name="name" required placeholder="Your full name" /></div>
                    <div><Label>Email *</Label><Input name="email" required type="email" placeholder="you@email.com" /></div>
                  </div>
                  <div><Label>Phone *</Label><Input name="phone" required placeholder="+1 (555) 000-0000" /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>University</Label>
                      <Input name="university" placeholder="University name (if applicable)" />
                      <p className="mt-1 text-xs text-muted-foreground">Leave blank if not applicable</p>
                    </div>
                    <div>
                      <Label>Major / Field of Study</Label>
                      <Input placeholder="e.g., Computer Science" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Degree</Label>
                      <Input placeholder="e.g., Master's, Bachelor's" />
                      <p className="mt-1 text-xs text-muted-foreground">Your highest degree or current program</p>
                    </div>
                    <div>
                      <Label>Graduation Year</Label>
                      <Input placeholder="e.g., 2025" />
                      <p className="mt-1 text-xs text-muted-foreground">Expected or completed graduation year</p>
                    </div>
                  </div>
                  <div>
                    <Label>Visa Status</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select your visa status" /></SelectTrigger>
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
                    <p className="mt-1 text-xs text-muted-foreground">This helps us tailor our approach to your situation</p>
                  </div>
                  <div>
                    <Label>Resume Upload (Optional)</Label>
                    <Input type="file" accept=".pdf,.doc,.docx" />
                    <p className="mt-1 text-xs text-muted-foreground">PDF or Word document preferred</p>
                  </div>
                  <div>
                    <Label>How did you hear about us?</Label>
                    <Select onValueChange={setReferralSource}>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
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
                    <div>
                      <Label>Friend's Name</Label>
                      <Input placeholder="Who referred you to HYRIND?" />
                    </div>
                  )}

                  {/* Terms & Privacy */}
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                      I agree to HYRIND's{" "}
                      <a href="/terms" className="font-medium text-secondary underline-offset-4 hover:underline">Terms & Conditions</a>{" "}
                      and{" "}
                      <a href="/privacy-policy" className="font-medium text-secondary underline-offset-4 hover:underline">Privacy Policy</a>.
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="hero" type="submit">Submit Interest</Button>
                    <Button variant="ghost" type="button" onClick={() => { setWantsMarketing(null); setTermsAccepted(false); }}>Back</Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
