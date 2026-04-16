import React, { useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, CheckCircle, Target, TrendingUp, Users, Zap, BarChart3, Lock } from "lucide-react";

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

const benefits = [
  { icon: Target, title: "Precision Targeting", desc: "We match your profile to roles where you're highly competitive, not just any opening." },
  { icon: TrendingUp, title: "Higher Response Rate", desc: "Recruiter-driven submissions significantly increase callback rates compared to solo job hunting." },
  { icon: Users, title: "Network Access", desc: "Leverage our extensive network of hiring managers and recruiters in your target companies." },
  { icon: Zap, title: "Time Efficiency", desc: "Let us handle applications while you focus on interviews and preparation." },
  { icon: BarChart3, title: "Data-Driven", desc: "Weekly analytics showing submission metrics, response rates, and market insights." },
  { icon: Lock, title: "Full Transparency", desc: "Track every application, feedback, and interaction in real-time." },
];

const processSteps = [
  { step: 1, title: "Profile Assessment", desc: "We analyze your background, skills, and career goals to create a personalized positioning strategy." },
  { step: 2, title: "Resume Optimization", desc: "Your resume is customized for each target role, highlighting relevant skills and achievements." },
  { step: 3, title: "Market Research", desc: "We identify 20-30 target companies and roles aligned with your experience and goals." },
  { step: 4, title: "Daily Submissions", desc: "Consistent, strategic applications with personalized cover notes to hiring managers." },
  { step: 5, title: "Proactive Outreach", desc: "Recruiters reach out directly to hiring managers and decision-makers on your behalf." },
  { step: 6, title: "Optimization & Reporting", desc: "Weekly progress reviews with response analysis and strategy adjustments as needed." },
];

const ProfileMarketing = () => {
  useEffect(() => {
    document.body.style.paddingTop = '80px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white">
          <div className="container px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl">
              <div className="mb-6 inline-block rounded-full bg-blue-400/20 px-4 py-2">
                <span className="text-sm font-semibold text-blue-200">Most Popular Service</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Recruiter-Led Profile Marketing
              </h1>
              <p className="text-xl lg:text-2xl text-blue-100 mb-8 leading-relaxed">
                Stop applying to jobs. Let our dedicated recruiter market your profile directly to hiring managers at top companies every single day—with customized resumes, strategic positioning, and real-time tracking.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="lg" className="gap-2 bg-white text-blue-900 hover:bg-blue-50 text-lg h-14 px-8" asChild>
                  <a href="/contact">Get Started Today <ArrowRight className="h-5 w-5" /></a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2 border-white text-white hover:bg-white/10 text-lg h-14 px-8" asChild>
                  <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-5 w-5 bg-blue-500" /> <span className="text-black">Book Free Consultation</span>
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Problem & Solution */}
        <section className="py-20 lg:py-28 bg-gray-50">
          <div className="container px-4">
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">The Problem</h2>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-xl">✕</span>
                    <span className="text-gray-700">Job boards are flooded with thousands of applicants</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-xl">✕</span>
                    <span className="text-gray-700">Your resume gets lost in applicant tracking systems</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-xl">✕</span>
                    <span className="text-gray-700">Generic applications rarely get callbacks</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-xl">✕</span>
                    <span className="text-gray-700">You have no visibility into recruiter interest</span>
                  </li>
                </ul>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Solution</h2>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Direct recruiter outreach bypasses applicant queues</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Customized resume for each role increases relevance</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Personal notes to hiring managers create connection</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Real-time CRM tracking shows every interaction</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-center text-gray-900 mb-4">
                How Profile Marketing Works
              </motion.h2>
              <p className="text-center text-gray-600 text-lg mb-16">From profile assessment to daily submissions, here's our proven 6-step process:</p>
              
              <div className="grid md:grid-cols-2 gap-8">
                {processSteps.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative p-8 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-shadow"
                  >
                    <div className="absolute -top-5 -left-5 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 pt-4">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 lg:py-28 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-center text-gray-900 mb-4">
                Why Candidates Choose Profile Marketing
              </motion.h2>
              <p className="text-center text-gray-600 text-lg mb-16">Experience real recruiting advantages that accelerate your job search:</p>
              
              <div className="grid md:grid-cols-2 gap-8">
                {benefits.map((benefit, idx) => {
                  const Icon = benefit.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex gap-4 p-6 bg-white rounded-xl border border-blue-100 hover:border-blue-300 transition-colors"
                    >
                      <Icon className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{benefit.title}</h3>
                        <p className="text-gray-600">{benefit.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-gray-900 mb-4">
                What's Included in Profile Marketing
              </motion.h2>
              <p className="text-gray-600 text-lg mb-12">Everything you need for a successful recruiter-led job search:</p>
              
              <div className="space-y-4">
                {features.map((item, idx) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 p-4 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-blue-600" />
                    <span className="text-gray-700 text-lg">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="py-20 lg:py-28 bg-blue-900 text-white">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-16">Results You Can Expect</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
                  <div className="text-5xl font-bold text-blue-200 mb-3">3-5x</div>
                  <p className="text-xl">Higher response rates vs. solo applications</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-center">
                  <div className="text-5xl font-bold text-blue-200 mb-3">50+</div>
                  <p className="text-xl">Applications submitted per month</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-center">
                  <div className="text-5xl font-bold text-blue-200 mb-3">15-20</div>
                  <p className="text-xl">Interview callbacks per candidate</p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to Stop Job Hunting and Start Getting Recruited?</h2>
              <p className="text-lg text-gray-600 mb-10">Let our expert recruiters market your profile to top companies. Limited spots available each month.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" className="gap-2 text-lg h-14 px-8" asChild>
                  <a href="/contact">Start Profile Marketing <ArrowRight className="h-5 w-5" /></a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2 text-lg h-14 px-8" asChild>
                  <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-5 w-5" /> Schedule Consultation
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProfileMarketing;
