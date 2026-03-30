import Header from "@/components/layout/Header";
import SEO from "@/components/SEO";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya M.",
    role: "Software Engineer",
    text: "HYRIND completely changed my job search experience. My recruiter optimized my resume for every application and I had full visibility into where my profile was being submitted. The daily submission logs in my portal kept me informed at every step. I landed a role within 6 weeks.",
  },
  {
    name: "Ahmed R.",
    role: "Data Analyst",
    text: "The screening call practice was a game-changer. I used to freeze during recruiter calls, but after multiple mock sessions and detailed feedback from my HYRIND team, I felt confident and prepared for every conversation. The STAR method coaching made a real difference.",
  },
  {
    name: "Jessica L.",
    role: "Business Analyst",
    text: "What I appreciated most was the transparency. I could see daily how many applications were submitted, which companies, and the status of each. No other service gave me that level of visibility. My recruiter treated my job search like their own priority.",
  },
  {
    name: "Ravi K.",
    role: "Full Stack Developer",
    text: "As an international student on OPT, I was overwhelmed by the US job market. HYRIND's team guided me through everything — resume format, interview prep, role-specific training, and screening call practice. They understood the visa complexities and tailored their approach accordingly. Highly recommend.",
  },
  {
    name: "Sarah T.",
    role: "Product Manager",
    text: "The dedicated recruiter model is what sets HYRIND apart. My recruiter knew my goals, my strengths, and marketed me accordingly. It felt like having a career partner, not just a service. The weekly check-ins and strategy adjustments were invaluable.",
  },
  {
    name: "Michael C.",
    role: "QA Engineer",
    text: "I was skeptical at first, but the results spoke for themselves. Within the first month, I had multiple screening calls and two interviews lined up. The daily submission logs, interview coaching, and recruiter outreach to hiring managers made all the difference in my career outcome.",
  },
];

const Reviews = () => {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <SEO title="Reviews" description="Hear from candidates who landed jobs through HYRIND's recruiter-led profile marketing and interview support." path="/reviews" />
      <Header />
      <main className="flex-1">
        <section className="bg-white border-b border-neutral-200 pt-32 pb-16 lg:pt-40 lg:pb-24">
          <div className="container px-4 md:px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-[#0d47a1] sm:text-5xl">What Our Candidates Say</h1>
              <p className="mt-6 text-lg text-neutral-600">
                Real feedback from job seekers who trusted HYRIND with their career journey. Our candidates value the transparency, recruiter support, and real results.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md flex flex-col"
                >
                  <Quote className="mb-5 h-8 w-8 text-[#0d47a1]/20" />
                  <p className="mb-8 text-sm leading-relaxed text-neutral-700">{t.text}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-100">
                    <div>
                      <p className="font-bold text-neutral-900">{t.name}</p>
                      <p className="text-xs font-medium text-neutral-500">{t.role}</p>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Reviews;
