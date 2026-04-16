import React, { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, CheckCircle, BookOpen, Zap, Target, Rocket, Play, Trophy, TrendingUp } from "lucide-react";

const features = [
  "Role-specific skills roadmaps aligned with market demand",
  "Curated, recruiter-approved learning resources (Google Drive, platforms)",
  "Weekly tasks, milestones, and measurable progress tracking",
  "Centralized learning access through your candidate portal",
  "Trainer guidance and mentorship from industry professionals",
  "Real-world project exposure and hands-on practice assignments",
  "Tool and technology training relevant to your target roles",
  "Ongoing support and upskilling until placement",
  "Portfolio project guidance and verification",
  "Weekly trainer check-ins and progress reviews",
];

const benefits = [
  { icon: Target, title: "Role-Specific Roadmaps", desc: "Customized learning paths designed specifically for your target roles and career goals." },
  { icon: BookOpen, title: "Curated Resources", desc: "No overwhelm—we provide handpicked, proven learning materials verified by recruiters." },
  { icon: Rocket, title: "Hands-On Projects", desc: "Real-world assignments that build portfolios and demonstrate actual job-ready skills." },
  { icon: TrendingUp, title: "Measurable Progress", desc: "Track milestone completions, skill assessments, and tangible improvements weekly." },
  { icon: Play, title: "Live Trainer Sessions", desc: "Weekly trainer sessions, Q&A, and mentorship to clarify concepts and stay motivated." },
  { icon: Trophy, title: "Verified Credentials", desc: "Portfolio projects verified by trainers to showcase real competency to employers." },
];

const sampleRoadmaps = [
  {
    title: "Full-Stack Web Development",
    duration: "12-16 weeks",
    skills: ["JavaScript/TypeScript", "React.js", "Node.js", "Databases (SQL/NoSQL)", "APIs", "Deployment"],
    projects: "3-4 real-world projects"
  },
  {
    title: "Data Analytics & Python",
    duration: "10-14 weeks",
    skills: ["Python", "SQL", "Data Visualization", "Tableau/Power BI", "Statistical Analysis", "Excel Advanced"],
    projects: "2-3 portfolio projects"
  },
  {
    title: "Cloud & DevOps (AWS/Azure)",
    duration: "12-16 weeks",
    skills: ["AWS/Azure Fundamentals", "Docker & Kubernetes", "CI/CD Pipelines", "Infrastructure as Code", "Linux", "Networking"],
    projects: "3-4 hands-on labs"
  },
  {
    title: "UI/UX Design & Figma",
    duration: "10-12 weeks",
    skills: ["Design Fundamentals", "Figma", "User Research", "Prototyping", "Accessibility", "Design Systems"],
    projects: "2-3 portfolio designs"
  },
];

const SkillsTraining = () => {
  const [activeRoadmap, setActiveRoadmap] = useState(0);

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
        <section className="py-20 lg:py-32 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white">
          <div className="container px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl">
              <div className="mb-6 inline-block rounded-full bg-emerald-400/20 px-4 py-2">
                <span className="text-sm font-semibold text-emerald-200">Market-Ready Skills Training</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Bridge Your Skill Gaps Fast
              </h1>
              <p className="text-xl lg:text-2xl text-emerald-100 mb-8 leading-relaxed">
                Master in-demand skills with role-specific training paths, real-world projects, trainer mentorship, and portfolio projects—all aligned to what employers are actually hiring for right now.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="lg" className="gap-2 bg-white text-emerald-900 hover:bg-emerald-50 text-lg h-14 px-8" asChild>
                  <a href="/contact">Start Skills Training <ArrowRight className="h-5 w-5" /></a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2 border-white text-white hover:bg-white/10 text-lg h-14 px-8" asChild>
                  <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-5 w-5 bg-emerald-500" /> <span className="text-black">Explore Roadmaps</span>
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The Problem */}
        <section className="py-20 lg:py-28 bg-gray-50">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-gray-900 mb-4">
                The Skills Gap Problem
              </motion.h2>
              <p className="text-gray-600 text-lg mb-12">
                Job market requirements are constantly evolving. By the time you learn a skill, employers want the next one. Random online courses waste time without clear career alignment.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-6 bg-white rounded-xl border border-red-200">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">❌ The Problem</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• No clear learning path</li>
                    <li>• Too many options, unclear priorities</li>
                    <li>• Learning doesn't match job requirements</li>
                    <li>• No hands-on experience</li>
                    <li>• Wasted time on outdated skills</li>
                  </ul>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="p-6 bg-white rounded-xl border border-blue-200">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">📊 Market Reality</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• 70% of jobs require new skills</li>
                    <li>• Hiring teams skip candidates missing key tech</li>
                    <li>• Portfolio projects beat certifications</li>
                    <li>• Practical experience is critical</li>
                    <li>• Time-to-market matters</li>
                  </ul>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="p-6 bg-white rounded-xl border border-green-200">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">✅ Our Solution</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Role-specific learning paths</li>
                    <li>• Recruiter-curated resources</li>
                    <li>• Real-world project assignments</li>
                    <li>• Live trainer mentorship</li>
                    <li>• Verified portfolio projects</li>
                  </ul>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* How Learning Works */}
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-center text-gray-900 mb-4">
                How Our Skills Training Works
              </motion.h2>
              <p className="text-center text-gray-600 text-lg mb-16">Structured learning with real support and accountability:</p>
              
              <div className="space-y-8">
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex gap-6 p-8 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">1</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Assessment & Roadmap Creation</h3>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      We assess your current skills, target role, and learning speed. You receive a personalized 10-16 week roadmap with weekly milestones, curated resources, and clear progress markers.
                    </p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="flex gap-6 p-8 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200">
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">2</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Weekly Learning & Tasks</h3>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      Each week: 3-5 hours of guided learning with curated resources, practical tasks to apply knowledge, and real-world scenarios. All materials are in your candidate portal.
                    </p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex gap-6 p-8 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                  <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">3</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Live Trainer Sessions</h3>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      Weekly live sessions with trainers for Q&A, clarifications, and mentorship. Debug challenges, ask questions, and get expert guidance in real-time.
                    </p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex gap-6 p-8 rounded-2xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200">
                  <div className="w-16 h-16 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">4</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Portfolio Projects</h3>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      Build 2-4 real portfolio projects that showcase your skills. Trainers provide guidance, review your code/work, and verify competency—creating proof for employers.
                    </p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="flex gap-6 p-8 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <div className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">5</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Continuous Improvement</h3>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      Progress tracked weekly with trainer feedback. Roadmap adjusts based on pace. Interview-ready candidates graduate with verified skills and portfolio-backed confidence.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Roadmaps */}
        <section className="py-20 lg:py-28 bg-gray-50">
          <div className="container px-4">
            <div className="max-w-5xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-center text-gray-900 mb-4">
                Popular Skill Roadmaps
              </motion.h2>
              <p className="text-center text-gray-600 text-lg mb-12">Examples of role-specific learning paths we offer:</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {sampleRoadmaps.map((roadmap, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setActiveRoadmap(idx)}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      activeRoadmap === idx 
                        ? 'bg-emerald-50 border-emerald-500 shadow-lg' 
                        : 'bg-white border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{roadmap.title}</h3>
                      {activeRoadmap === idx && <span className="text-emerald-600 text-2xl">✓</span>}
                    </div>
                    <p className="text-emerald-600 font-semibold mb-4">{roadmap.duration}</p>
                    <div>
                      <p className="font-semibold text-gray-900 mb-2 text-sm">Key Skills:</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {roadmap.skills.slice(0, 3).map((skill, i) => (
                          <span key={i} className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                            {skill}
                          </span>
                        ))}
                        {roadmap.skills.length > 3 && (
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                            +{roadmap.skills.length - 3} more
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">
                        <span className="font-semibold">Projects:</span> {roadmap.projects}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-center text-gray-900 mb-4">
                Why Skills Training Transforms Careers
              </motion.h2>
              
              <div className="grid md:grid-cols-2 gap-6 mt-16">
                {benefits.map((benefit, idx) => {
                  const Icon = benefit.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.08 }}
                      className="p-6 bg-white rounded-xl border border-emerald-100 hover:shadow-lg transition-shadow"
                    >
                      <Icon className="h-10 w-10 text-emerald-600 mb-4" />
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-20 lg:py-28 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-gray-900 mb-4">
                What's Included in Skills Training
              </motion.h2>
              <p className="text-gray-600 text-lg mb-12">Comprehensive learning support from day one to graduation:</p>
              
              <div className="space-y-4">
                {features.map((item, idx) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 p-4 rounded-lg hover:bg-white transition-colors"
                  >
                    <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-emerald-600" />
                    <span className="text-gray-700 text-lg">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Graduate Results</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center p-8 bg-emerald-50 rounded-xl">
                  <div className="text-5xl font-bold text-emerald-600 mb-3">92%</div>
                  <p className="text-xl text-gray-900">Graduation Rate</p>
                  <p className="text-gray-600 mt-2">Complete their roadmaps on schedule</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-center p-8 bg-emerald-50 rounded-xl">
                  <div className="text-5xl font-bold text-emerald-600 mb-3">3.2x</div>
                  <p className="text-xl text-gray-900">Interview Rate Increase</p>
                  <p className="text-gray-600 mt-2">With verified portfolio projects</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-center p-8 bg-emerald-50 rounded-xl">
                  <div className="text-5xl font-bold text-emerald-600 mb-3">6-8 wks</div>
                  <p className="text-xl text-gray-900">Average to First Interview</p>
                  <p className="text-gray-600 mt-2">After skills verification</p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-28 bg-emerald-900 text-white">
          <div className="container px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">Ready to Master the Skills That Get Hired?</h2>
              <p className="text-xl text-emerald-100 mb-10">
                Join a structured learning program with real accountability, trainer mentorship, and portfolio projects that prove your competency to employers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" className="gap-2 bg-white text-emerald-900 hover:bg-emerald-50 text-lg h-14 px-8" asChild>
                  <a href="/contact">Start Learning Today <ArrowRight className="h-5 w-5" /></a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2 border-white text-white hover:bg-white/10 text-lg h-14 px-8" asChild>
                  <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-5 w-5" /> Explore All Roadmaps
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

export default SkillsTraining;
