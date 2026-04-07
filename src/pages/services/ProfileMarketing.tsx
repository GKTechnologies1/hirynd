import React, { useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, CheckCircle } from "lucide-react";

const features = [
  "Dedicated recruiter assigned to manage your profile full-time",
  "Resume optimized and customized for every job posting",
  "Role-based submissions to targeted employers and hiring managers",
  "Monthly marketing strategy with a consistent daily application cadence",
  "CRM-based tracking with full transparency into every submission",
  "Direct recruiter outreach to hiring managers on your behalf",
  "LinkedIn profile review and optimization",
  "Daily application logs visible in your candidate portal",
  "Progress reports and weekly recruiter check-ins",
];

const ProfileMarketing = () => {
  useEffect(() => {
    document.body.style.paddingTop = '80px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="hero-gradient py-20 lg:py-28">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold text-primary-foreground sm:text-5xl">Profile Marketing</h1>
              <p className="mt-6 text-lg text-primary-foreground/70">
                Your dedicated recruiter markets your profile to the right employers — with resume optimization for every application, recruiter outreach to hiring managers, and full transparency into every submission through your candidate portal.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-8 text-2xl font-bold text-foreground">What's Included</h2>
              <ul className="space-y-4">
                {features.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                <Button variant="hero" size="lg" className="gap-2" asChild>
                  <a href="/contact">Get Started <ArrowRight className="h-4 w-4" /></a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2" asChild>
                  <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-4 w-4" /> Book a Consultation
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProfileMarketing;
