import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden hero-gradient py-24 lg:py-32">
      {/* Background image overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 hero-gradient opacity-80" />

      <div className="container relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl"
          >
            Focus on Skills
            <br />
            <span className="text-gradient" style={{ fontWeight: 600 }}>Let Us Handle the Rest</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 text-lg font-semibold text-primary-foreground sm:text-xl"
          >
            We Market Your Profile. You Focus on Your Career Growth.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mx-auto mt-6 max-w-2xl text-primary-foreground/70 text-left"
          >
            <p className="mb-4">
              At HYRIND, we help candidates land full-time opportunities in the United States without the stress of self-marketing. Our recruiter-led platform manages profile marketing, resume optimization, job submissions, recruiter outreach, screening call preparation, and end-to-end job search support.
            </p>
            <p>
              We support students, early-career professionals, and experienced candidates across the U.S. by combining expert profile marketing, role-based skills training, and real-time interview evaluation — ensuring every candidate is positioned for the right opportunity at the right time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button variant="hero" size="lg" className="gap-2" asChild>
              <a href="/contact">
                Submit Interest Form <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="hero-outline" size="lg" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                <Calendar className="h-4 w-4" /> Book a Free Consultation
              </a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
