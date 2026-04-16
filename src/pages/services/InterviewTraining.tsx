import React, { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, CheckCircle, Mic, Brain, Lightbulb, Award, Users, MessageSquare, ChevronDown } from "lucide-react";

const features = [
  "Realistic one-on-one mock interview sessions with industry professionals",
  "Screening call coaching with customized scripts and preparation guides",
  "Behavioral and technical interview preparation tailored to your role",
  "STAR method coaching for structured, impactful, memorable answers",
  "Voice, communication, pacing, and confidence improvement training",
  "Industry-specific question banks and targeted guidance",
  "Real-time feedback and personalized improvement plans",
  "Confidence-building through repeated, coached practice sessions",
  "Ongoing guidance and support until you're fully client-ready",
];

const benefits = [
  { icon: Brain, title: "Master Interview Framework", desc: "Learn proven techniques like the STAR method to structure compelling, relevant answers." },
  { icon: Mic, title: "Voice & Communication Coaching", desc: "Improve pace, tone, clarity, and presence to leave a lasting positive impression." },
  { icon: Lightbulb, title: "Industry-Specific Prep", desc: "Target preparation aligned with your specific role and industry requirements." },
  { icon: Award, title: "Confidence Building", desc: "Multiple practice sessions reduce anxiety and build genuine confidence for real interviews." },
  { icon: Users, title: "Diverse Interviewer Styles", desc: "Practice with different interviewer personalities and styles to handle any situation." },
  { icon: MessageSquare, title: "Personalized Feedback", desc: "Detailed feedback after each session with actionable improvement areas." },
];

const faqs = [
  {
    q: "How many mock interviews do I get?",
    a: "Typically 4-6 mock interviews per month depending on your package. Each session is tailored to your target roles and preparation needs."
  },
  {
    q: "Can you prepare me for technical interviews?",
    a: "Yes! We cover both behavioral and technical interviews. We provide frameworks, practice questions, and real-time feedback on your technical explanations."
  },
  {
    q: "How long is each mock session?",
    a: "Usually 45-60 minutes: 20-30 min interview, 15-20 min feedback, and 10-15 min discussion on improvement areas."
  },
  {
    q: "What if I have an interview coming up soon?",
    a: "We can schedule crash courses! We often do intensive 1-week or 2-week preparation for candidates with upcoming interviews."
  },
];

const InterviewTraining = () => {
  const [expandedFaq, setExpandedFaq] = useState(0);

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
        <section className="py-20 lg:py-32 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-950 text-white">
          <div className="container px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl">
              <div className="mb-6 inline-block rounded-full bg-purple-400/20 px-4 py-2">
                <span className="text-sm font-semibold text-purple-200">High-Impact Interview Preparation</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Master Every Interview
              </h1>
              <p className="text-xl lg:text-2xl text-purple-100 mb-8 leading-relaxed">
                Build unshakeable confidence with mock interviews, real-time feedback, and personalized coaching. From initial screening calls to final rounds—we prepare you to impress every interviewer.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="lg" className="gap-2 bg-white text-purple-900 hover:bg-purple-50 text-lg h-14 px-8" asChild>
                  <a href="/contact">Start Interview Training <ArrowRight className="h-5 w-5" /></a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2 border-white text-white hover:bg-white/10 text-lg h-14 px-8" asChild>
                  <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-5 w-5 bg-purple-500" /> <span className="text-black">Book Mock Interview</span>
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The Challenge */}
        <section className="py-20 lg:py-28 bg-gray-50">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-gray-900 mb-4">
                The Interview Challenge
              </motion.h2>
              <p className="text-gray-600 text-lg mb-12">
                You've made it past the application stage—now the real pressure begins. Interviews are where candidates often stumble, not because they lack skills, but because they haven't practiced with real feedback.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="p-8 bg-white rounded-xl border border-red-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="text-2xl">❌</span> Common Interview Challenges
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-gray-700">
                      <span className="text-red-500 font-bold">•</span>
                      Rambling or unfocused answers that lose the interviewer
                    </li>
                    <li className="flex gap-3 text-gray-700">
                      <span className="text-red-500 font-bold">•</span>
                      Difficulty explaining technical concepts clearly
                    </li>
                    <li className="flex gap-3 text-gray-700">
                      <span className="text-red-500 font-bold">•</span>
                      Nervous body language and speaking pace issues
                    </li>
                    <li className="flex gap-3 text-gray-700">
                      <span className="text-red-500 font-bold">•</span>
                      Forgetting to tell a compelling story with your experience
                    </li>
                    <li className="flex gap-3 text-gray-700">
                      <span className="text-red-500 font-bold">•</span>
                      Not knowing how to handle tough or unexpected questions
                    </li>
                  </ul>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="p-8 bg-white rounded-xl border border-green-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="text-2xl">✅</span> Our Solution
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      Structured frameworks (STAR) for concise, impactful answers
                    </li>
                    <li className="flex gap-3 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      Real-time feedback on communication and clarity
                    </li>
                    <li className="flex gap-3 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      Voice coaching for tone, pace, and presence
                    </li>
                    <li className="flex gap-3 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      Practice with diverse interview styles and scenarios
                    </li>
                    <li className="flex gap-3 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      Confidence building through repeated, safe practice
                    </li>
                  </ul>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-center text-gray-900 mb-4">
                Our Interview Preparation Approach
              </motion.h2>
              <p className="text-center text-gray-600 text-lg mb-16">
                A structured, proven program that builds real confidence through practice and personalized coaching.
              </p>
              
              <div className="space-y-8">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-8 rounded-2xl bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">1</span>
                    Assessment & Strategy
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    We learn about your target roles, company types, and interview history. We identify your key strengths and areas for improvement, then build a customized preparation plan.
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">2</span>
                    STAR Method Training
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Master the STAR framework (Situation, Task, Action, Result) to structure behavioral answers that demonstrate impact. We teach you to tell compelling stories concisely.
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="p-8 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">3</span>
                    Mock Interview Sessions
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Realistic 1-on-1 mock interviews with industry professionals who ask real questions, challenge your answers, and interview like actual hiring managers. Non-stop practice.
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="p-8 rounded-2xl bg-gradient-to-r from-cyan-50 to-cyan-100 border border-cyan-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="bg-cyan-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">4</span>
                    Real-Time Feedback & Coaching
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Immediately after each session, receive detailed feedback on content, delivery, body language, and tone. We pinpoint exact improvement areas and coach you through them.
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 lg:py-28 bg-gradient-to-br from-purple-50 to-indigo-50">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-center text-gray-900 mb-4">
                Why Interview Training Works
              </motion.h2>
              <p className="text-center text-gray-600 text-lg mb-16">Benefits that compound with every practice session:</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {benefits.map((benefit, idx) => {
                  const Icon = benefit.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.08 }}
                      className="p-6 bg-white rounded-xl border border-purple-100 hover:shadow-lg transition-shadow"
                    >
                      <Icon className="h-10 w-10 text-purple-600 mb-4" />
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
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-gray-900 mb-4">
                What's Included
              </motion.h2>
              <p className="text-gray-600 text-lg mb-12">Complete interview preparation training:</p>
              
              <div className="space-y-4">
                {features.map((item, idx) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 p-4 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-purple-600" />
                    <span className="text-gray-700 text-lg">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-28 bg-gray-50">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto">
              <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl font-bold text-gray-900 mb-4 text-center">
                Frequently Asked Questions
              </motion.h2>
              
              <div className="space-y-4 mt-12">
                {faqs.map((faq, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="border border-purple-200 rounded-lg overflow-hidden bg-white"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? -1 : idx)}
                      className="w-full p-6 text-left flex items-center justify-between hover:bg-purple-50 transition-colors"
                    >
                      <h3 className="font-bold text-gray-900 text-lg">{faq.q}</h3>
                      <ChevronDown className={`h-6 w-6 text-purple-600 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-6 pb-6 text-gray-700 border-t border-purple-100">
                        {faq.a}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-28">
          <div className="container px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Confident Candidates Get More Offers</h2>
              <p className="text-lg text-gray-600 mb-10">
                Start your interview training today and walk into your next interview with unshakeable confidence, proven techniques, and real-world practice behind you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" className="gap-2 text-lg h-14 px-8" asChild>
                  <a href="/contact">Get Interview Training <ArrowRight className="h-5 w-5" /></a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2 text-lg h-14 px-8" asChild>
                  <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-5 w-5" /> Book First Mock Session
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

export default InterviewTraining;
