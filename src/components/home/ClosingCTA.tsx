import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";

const ClosingCTA = () => {
  return (
    <section className="hero-gradient py-20 lg:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Ready to Get More Interviews?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/70">
            Join HYRIND and start receiving recruiter calls and real interview opportunities. Let our team market your profile while you focus on growing your career.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="hero" size="lg" className="gap-2" asChild>
              <a href="/contact?type=interest">
                Submit Interest <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="hero-outline" size="lg" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                <Calendar className="h-4 w-4" /> Book a Call
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ClosingCTA;
