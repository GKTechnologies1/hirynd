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
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
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
        onClick: () => window.open('https://cal.com/hyrind', '_blank')
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
    <div className="how-it-works-page">
      <SEO title="How It Works | HYRIND" description="Your streamlined journey from interest to interview success, guided by experts at every step." path="/how-it-works" />
      <Header />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .how-it-works-page {
          background-color: #f8fafc;
          color: #0f172a;
          font-family: 'Outfit', sans-serif;
          overflow-x: hidden;
        }

        /* Hero Styling */
        .hiw-hero {
          background: linear-gradient(135deg, #0d47a1 0%, #1e40af 100%);
          color: white;
          padding: 160px 24px 120px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hiw-hero::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('https://www.transparenttextures.com/patterns/cubes.png');
          opacity: 0.05;
          pointer-events: none;
        }

        .hiw-hero-content {
          max-width: 900px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .hiw-hero h1 {
          font-size: clamp(3rem, 8vw, 4.5rem);
          font-weight: 800;
          margin-bottom: 24px;
          letter-spacing: -0.04em;
          line-height: 1.1;
        }

        .hiw-hero p {
          font-size: 1.25rem;
          opacity: 0.9;
          font-weight: 300;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Intro Section */
        .hiw-intro-section {
          padding: 100px 24px;
          text-align: center;
          background: white;
        }

        .hiw-intro-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .hiw-intro-text {
          font-size: 1.25rem;
          line-height: 1.8;
          color: #475569;
          margin-bottom: 32px;
          font-weight: 400;
        }

        /* Roadmap Section */
        .roadmap-section {
          padding: 100px 24px;
          background: #f1f5f9;
        }

        .roadmap-container {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 40px;
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
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
        }

        .step-card-premium:hover {
          transform: translateX(10px);
          border-color: #3b82f6;
          box-shadow: 0 20px 50px rgba(13, 71, 161, 0.08);
        }

        .step-badge-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
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

        .step-line {
          width: 4px;
          flex-grow: 1;
          background: linear-gradient(to bottom, #0d47a1, #e2e8f0);
          border-radius: 2px;
        }

        .step-card-premium:last-child .step-line {
          display: none;
        }

        .step-content-wrap h3 {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .icon-premium {
          color: #3b82f6;
          opacity: 0.8;
        }

        .step-text-p {
          font-size: 1.1rem;
          line-height: 1.7;
          color: #475569;
          margin-bottom: 15px;
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

        .btn-premium-hiw:hover {
          background: #1e40af;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(13, 71, 161, 0.2);
        }

        /* Why Different */
        .why-diff-section {
          padding: 120px 24px;
          background: white;
        }

        .diff-header {
          text-align: center;
          margin-bottom: 80px;
        }

        .diff-header h2 {
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .diff-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .diff-card-premium {
          padding: 40px;
          border-radius: 24px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          transition: 0.3s;
        }

        .diff-card-premium:hover {
          background: white;
          box-shadow: 0 20px 40px rgba(0,0,0,0.05);
          transform: translateY(-5px);
          border-color: #3b82f6;
        }

        .diff-icon-wrap {
          width: 50px;
          height: 50px;
          background: #eff6ff;
          color: #0d47a1;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 25px;
        }

        .diff-card-premium h4 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 15px;
        }

        .diff-card-premium p {
          color: #64748b;
          line-height: 1.6;
        }

        /* Final CTA */
        .hiw-final-cta {
          margin: 0 24px 100px;
          background: linear-gradient(135deg, #0d47a1 0%, #1e40af 100%);
          padding: 100px 48px;
          border-radius: 40px;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hiw-final-cta h2 {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 20px;
        }

        .hiw-final-cta p {
          font-size: 1.2rem;
          margin-bottom: 40px;
          opacity: 0.9;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-btn-group {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-white {
          background: white;
          color: #0d47a1;
          padding: 18px 40px;
          border-radius: 14px;
          font-weight: 800;
          text-decoration: none;
          transition: 0.3s;
        }

        .btn-white:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        @media (max-width: 768px) {
          .step-card-premium {
            grid-template-columns: 1fr;
            padding: 30px;
            text-align: center;
          }
          .step-badge-wrap {
            flex-direction: row;
            justify-content: center;
          }
          .step-line {
            display: none;
          }
          .step-content-wrap h3 {
            flex-direction: column;
            gap: 10px;
          }
        }

        .hiw-divider-statement {
          text-align: center;
          padding-bottom: 100px;
        }

        .hiw-divider-statement p {
          font-size: 1.3rem;
          font-weight: 600;
          color: #475569;
          font-style: italic;
        }
      `}</style>

      {/* Hero */}
      <section className="hiw-hero">
        <div className="hiw-hero-content">
          <h1>How It Works</h1>
          <p>Your streamlined journey from interest to interview success, guided by experts at every step.</p>
        </div>
      </section>

      {/* Intro */}
      <section className="hiw-intro-section">
        <div className="hiw-intro-container">
          <p className="hiw-intro-text">
            At HYRIND, we take a structured, recruiter-led approach to job support so candidates don’t have to navigate the complex U.S. job market alone.
          </p>
          <div style={{ height: '4px', width: '60px', background: '#0d47a1', margin: '0 auto' }}></div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="roadmap-section">
        <div className="roadmap-container">
          {steps.map((item, index) => (
            <div key={index} className="step-card-premium">
              <div className="step-badge-wrap">
                <div className="step-number-circle">{item.step}</div>
                <div className="step-line"></div>
              </div>
              <div className="step-content-wrap">
                <h3>
                  <span className="icon-premium">{item.icon}</span>
                  {item.title}
                </h3>
                {item.content.map((text, i) => (
                  <p key={i} className="step-text-p">{text}</p>
                ))}
                {item.action && (
                  <button className="btn-premium-hiw" onClick={item.action.onClick}>
                    {item.action.icon && <span style={{ marginRight: '8px' }}>{item.action.icon}</span>}
                    {item.action.label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Different */}
      <section className="why-diff-section">
        <div className="diff-header">
          <h2>Why This Works Differently</h2>
        </div>
        <div className="diff-grid-premium">
          {[
            { icon: <TrendingUp />, title: "Recruiter-Led Marketing", desc: "No automated mass-applying. Real recruiters build real connections for you." },
            { icon: <Layers />, title: "Precision Resume Builds", desc: "We don't just 'edit' resumes; we architect them for specific roles." },
            { icon: <Zap />, title: "High-Intensity Prep", desc: "Our mock calls simulate the high-pressure environment of real interviews." },
            { icon: <Users />, title: "Dedicated Support Team", desc: "A constant feedback loop ensuring you evolve with every single interaction." }
          ].map((card, i) => (
            <div key={i} className="diff-card-premium">
              <div className="diff-icon-wrap">{card.icon}</div>
              <h4>{card.title}</h4>
              <p>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="hiw-final-cta">
        <h2>Ready to Start?</h2>
        <p>Whether you're a student, an early-career professional, or an experienced candidate, we are here to navigate the path with you.</p>
        <div className="cta-btn-group">
          <button onClick={() => navigate('/contact')} className="btn-white">Get Started Now</button>
          <button
            className="btn-white"
            style={{ background: 'transparent', color: 'white', border: '2px solid white' }}
            onClick={() => window.open('https://cal.com/hyrind', '_blank')}
          >
            Talk to Us
          </button>
        </div>
      </section>

      <div className="hiw-divider-statement">
        <p>“We believe in doing the right things, the right way, at the right time to deliver the right results.”</p>
      </div>
      
      <Footer />
    </div>
  );
}
