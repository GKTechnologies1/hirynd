import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import {
  Search,
  PhoneCall,
  Target,
  UserPlus,
  TrendingUp,
  Calendar,
  Layers,
  Zap,
  Users
} from "lucide-react";

export default function HowItWorks() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.paddingTop = '80px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  const steps = [
    {
      step: 1,
      title: "Explore HYRIND & Submit Interest",
      icon: <Search size={28} />,
      content: [
        "Your journey begins by exploring the HYRIND platform and understanding how we support job seekers through profile marketing, interview preparation, and role-based skill development.",
        "When ready, submit the interest form sharing your background and career goals. This helps us understand how we can best support your journey."
      ],
      action: {
        label: "Submit Interest Form",
        onClick: () => navigate('/contact')
      }
    },
    {
      step: 2,
      title: "Intro Call with HYRIND Team",
      icon: <PhoneCall size={28} />,
      content: [
        "We reach out to schedule an introductory call that is informative, transparent, and personalized to your career path.",
        "We walk you through our process, timelines, and the type of support you will receive, ensuring total alignment before moving forward."
      ],
      action: {
        label: "Book a Free Consultation",
        icon: <Calendar size={18} />,
        onClick: () => window.open('https://cal.com/hyrind/15min?layout=mobile', '_blank')
      }
    },
    {
      step: 3,
      title: "Approval & Role Alignment",
      icon: <Target size={28} />,
      content: [
        "Our team reviews your profile in detail and aligns you with suitable target roles based on your experience and market demand.",
        "We focus on roles where your profile has the strongest potential, ensuring all outreach is directed toward meaningful opportunities."
      ]
    },
    {
      step: 4,
      title: "Profile Setup & Preparation",
      icon: <UserPlus size={28} />,
      content: [
        "We build role-based resumes aligned with real job descriptions and define a clear skill roadmap to strengthen your profile.",
        "Preparation includes interview readiness sessions—helping you understand how recruiters evaluate candidates."
      ]
    },
    {
      step: 5,
      title: "Marketing & Interview Support",
      icon: <TrendingUp size={28} />,
      content: [
        "A dedicated recruiter actively markets your profile and connects with relevant hiring teams using your optimized profile.",
        "You receive continuous support, including mock calls and communication coaching, until you begin receiving interview opportunities."
      ]
    }
  ];

  return (
    <div className="how-it-works-page min-h-screen bg-white">
      <SEO title="How It Works | HYRIND" description="Your streamlined journey from interest to interview success, guided by experts at every step." path="/how-it-works" />
      <Header />
      
      <style>{`
        .hiw-hero {
          background: linear-gradient(135deg, #0d47a1 0%, #1e40af 100%);
          color: white;
          padding: 120px 24px 80px;
          text-align: center;
          position: relative;
        }

        .step-card-premium {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 30px;
          background: white;
          padding: 50px;
          border-radius: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          border: 1px solid #e2e8f0;
          transition: all 0.4s ease;
          margin-bottom: 40px;
        }

        .step-card-premium:hover {
          transform: translateX(10px);
          border-color: #3b82f6;
          box-shadow: 0 20px 50px rgba(13, 71, 161, 0.08);
        }

        .step-number-circle {
          width: 70px;
          height: 70px;
          background: #0d47a1;
          color: white;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 800;
          box-shadow: 0 8px 16px rgba(13, 71, 161, 0.2);
        }

        .btn-premium-hiw {
          margin-top: 15px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0d47a1;
          color: white;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: 0.3s;
        }

        .hiw-final-cta {
          margin: 0 24px 100px;
          background: linear-gradient(135deg, #0d47a1 0%, #1e40af 100%);
          padding: 80px 48px;
          border-radius: 40px;
          color: white;
          text-align: center;
        }

        @media (max-width: 768px) {
          .step-card-premium {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .step-number-circle {
            margin: 0 auto;
          }
        }
      `}</style>

      <main>
        <section className="hiw-hero">
           <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl font-extrabold mb-6">How It Works</h1>
              <p className="text-xl opacity-90">Your streamlined journey from interest to interview success, guided by experts at every step.</p>
           </div>
        </section>

        <section className="py-20 bg-gray-50">
           <div className="max-w-5xl mx-auto px-6">
              {steps.map((item, index) => (
                <div key={index} className="step-card-premium">
                   <div className="flex flex-col items-center">
                      <div className="step-number-circle">{item.step}</div>
                   </div>
                   <div>
                      <h3 className="text-3xl font-extrabold text-blue-900 mb-6 flex items-center gap-4">
                        <span className="text-blue-500">{item.icon}</span>
                        {item.title}
                      </h3>
                      {item.content.map((text, i) => (
                        <p key={i} className="text-lg text-gray-600 mb-4 leading-relaxed">{text}</p>
                      ))}
                      {item.action && (
                        <button className="btn-premium-hiw" onClick={item.action.onClick}>
                          {item.action.icon && <span className="mr-2">{item.action.icon}</span>}
                          {item.action.label}
                        </button>
                      )}
                   </div>
                </div>
              ))}
           </div>
        </section>

        <section className="py-20 bg-white text-center">
           <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-4xl font-extrabold mb-12">Why This Works Differently</h2>
              <div className="grid md:grid-cols-4 gap-8">
                 {[
                   { icon: <TrendingUp size={32} />, title: "Recruiter-Led Marketing", desc: "No automated mass-applying. Real recruiters build real connections for you." },
                   { icon: <Layers size={32} />, title: "Precision Resume Builds", desc: "We don't just 'edit' resumes; we architect them for specific roles." },
                   { icon: <Zap size={32} />, title: "High-Intensity Prep", desc: "Our mock calls simulate the high-pressure environment of real interviews." },
                   { icon: <Users size={32} />, title: "Dedicated Support Team", desc: "A constant feedback loop ensuring you evolve with every single interaction." }
                 ].map((card, i) => (
                   <div key={i} className="p-8 bg-gray-50 rounded-3xl hover:bg-white hover:shadow-xl transition-all border border-gray-100">
                      <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6">{card.icon}</div>
                      <h4 className="text-xl font-bold mb-4">{card.title}</h4>
                      <p className="text-gray-600">{card.desc}</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        <section className="hiw-final-cta mx-6">
           <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-extrabold mb-6">Ready to Start?</h2>
              <p className="text-xl opacity-90 mb-10">Whether you're a student, an early-career professional, or an experienced candidate, we are here to navigate the path with you.</p>
              <div className="flex justify-center gap-4 flex-wrap">
                 <button onClick={() => navigate('/candidate-login')} className="bg-white text-blue-900 px-10 py-4 rounded-xl font-bold hover:scale-105 transition-transform">
                    Get Started Now
                 </button>
                 <button onClick={() => window.open('https://cal.com/hyrind/15min?layout=mobile', '_blank')} className="border-2 border-white text-white px-10 py-4 rounded-xl font-bold hover:bg-white hover:text-blue-900 transition-all">
                    Talk to Us
                 </button>
              </div>
           </div>
        </section>

        <div className="text-center py-20 italic text-gray-500 font-semibold text-xl">
           <p>“We believe in doing the right things, the right way, at the right time to deliver the right results.”</p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
