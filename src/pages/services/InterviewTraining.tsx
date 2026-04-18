import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Mic, Brain, Lightbulb, Award, Users, MessageSquare, CheckCircle2, ArrowRight, ChevronDown, Sparkles } from "lucide-react";

export default function InterviewTraining() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.paddingTop = "80px";
    return () => { document.body.style.paddingTop = "0px"; };
  }, []);

  const features = [
    "Mock Client Call Simulations",
    "Real-Time Constructive Feedback",
    "Communication & Presence Coaching",
    "STAR Method & Behavioral Training",
    "Confidence & Anxiety Management",
    "Realistic one-on-one sessions with industry professionals",
    "Screening call coaching with customized scripts",
    "Industry-specific question banks",
    "Ongoing support until you're fully client-ready"
  ];

  return (
    <div className="service-detail-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .service-detail-page {
          font-family: 'Outfit', sans-serif;
          background-color: #fcfdfe;
          color: #0f172a;
          overflow-x: hidden;
        }

        .service-hero {
          background: radial-gradient(circle at top right, #1e40af, #0d47a1);
          color: white;
          padding: 160px 24px 100px;
          text-align: center;
          clip-path: ellipse(150% 100% at 50% 0%);
          position: relative;
        }

        .service-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url('https://www.transparenttextures.com/patterns/cubes.png');
          opacity: 0.1;
          pointer-events: none;
        }

        .hero-content {
          max-width: 900px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .hero-badge {
          display: inline-block;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          padding: 6px 20px;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .service-hero h1 {
          font-size: clamp(3rem, 8vw, 4.5rem);
          font-weight: 800;
          margin-bottom: 24px;
          letter-spacing: -0.04em;
          line-height: 1.1;
        }

        .service-hero p {
          font-size: 1.25rem;
          opacity: 0.9;
          font-weight: 300;
          max-width: 750px;
          margin: 0 auto 40px;
          line-height: 1.6;
        }

        .btn-premium-v2 {
          background: white;
          color: #0d47a1;
          padding: 20px 48px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 1.1rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          border: none;
          cursor: pointer;
        }

        .btn-premium-v2:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 30px 60px rgba(0,0,0,0.2);
        }

        .btn-outline-v2 {
          background: transparent;
          color: white;
          padding: 18px 44px;
          border-radius: 20px;
          font-weight: 700;
          border: 2px solid rgba(255,255,255,0.5);
          display: inline-flex;
          align-items: center;
          gap: 12px;
          transition: 0.3s;
        }

        .btn-outline-v2:hover {
          background: rgba(255,255,255,0.1);
          border-color: white;
        }

        .content-section {
          padding: 100px 24px;
        }

        .container-v2 {
          max-width: 1100px;
          margin: 0 auto;
        }

        .tag-v2 {
          color: #2563eb;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          display: block;
          margin-bottom: 12px;
        }

        .title-v2 {
          font-size: 3rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 24px;
          line-height: 1.2;
        }

        .desc-v2 {
          font-size: 1.2rem;
          line-height: 1.8;
          color: #475569;
          margin-bottom: 60px;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }

        .benefit-card {
          background: white;
          padding: 40px;
          border-radius: 30px;
          border: 1px solid #eef2ff;
          transition: 0.4s;
        }

        .benefit-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(37, 99, 235, 0.08);
          border-color: #2563eb;
        }

        .icon-wrap {
          width: 60px;
          height: 60px;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .split-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        @media (max-width: 991px) {
          .split-section { grid-template-columns: 1fr; }
        }

        .feature-list {
          list-style: none;
          padding: 0;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 18px;
          font-size: 1.1rem;
          font-weight: 500;
        }

        .it-faq-item {
          border: 1px solid #e0eaff;
          border-radius: 20px;
          overflow: hidden;
          background: white;
          margin-bottom: 15px;
        }

        .it-faq-btn {
          width: 100%;
          padding: 24px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: 0.2s;
        }

        .it-faq-btn h3 {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          font-family: 'Outfit', sans-serif;
        }

        .it-faq-body {
          padding: 0 30px 24px;
          color: #475569;
          font-size: 1rem;
          line-height: 1.7;
        }

        .final-cta {
          margin: 100px 24px;
          background: linear-gradient(135deg, #0d47a1 0%, #1e40af 100%);
          padding: 100px 48px;
          border-radius: 60px;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .final-cta::after {
          content: '';
          position: absolute;
          inset: 0;
          background: url('https://www.transparenttextures.com/patterns/cubes.png');
          opacity: 0.1;
          pointer-events: none;
        }

        .cta-content {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .floating-icon {
          position: absolute;
          width: 100px;
          height: 100px;
          background: rgba(255,255,255,0.1);
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          top: -30px;
          left: -30px;
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
      `}</style>

      <SEO 
        title="Interview & Screening Call Training | HYRIND" 
        description="Success in interviews requires more than just technical knowledge—it demands confidence and clear communication. Our sessions replicate real-world scenarios with experienced professionals." 
        path="/services/interview-training" 
      />
      <Header />

      {/* Hero */}
      <section className="service-hero">
        <div className="hero-content">
          <div className="hero-badge">High Impact Training</div>
          <h1>Interview & Screening Practice</h1>
          <p>
            Success in interviews requires more than just technical knowledge—it demands confidence and clear communication. Our sessions replicate real-world scenarios with experienced professionals who provide actionable feedback.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-premium-v2" onClick={() => navigate('/contact')}>
              Join Training Now <ArrowRight size={20} />
            </button>
            <button className="btn-outline-v2" onClick={() => window.open("https://cal.com/hyrind", "_blank")}>
              Book Free Mock Session
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="content-section">
        <div className="container-v2">
          <div className="split-section">
            <div>
              <span className="tag-v2">Master the STAR Method</span>
              <h2 className="title-v2">Confidence through Practice</h2>
              <p className="desc-v2">
                We help you master the STAR method and handle behavioral questions with ease. Our experts coach you on voice, communication, and presence until you are fully client-ready.
              </p>
              <ul className="feature-list">
                {features.map((f, i) => (
                  <li key={i} className="feature-item">
                    <CheckCircle2 size={24} style={{ color: '#2563eb' }} /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ position: 'relative' }}>
              <div className="floating-icon">
                <Mic size={50} color="white" />
              </div>
              <img 
                src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&q=80" 
                alt="Interview Training" 
                style={{ borderRadius: '40px', width: '100%', boxShadow: '0 40px 80px rgba(13,71,161,0.15)' }} 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="content-section" style={{ background: '#f8fafc' }}>
        <div className="container-v2">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <span className="tag-v2">Why It Works</span>
            <h2 className="title-v2">The HYRIND Interview Advantage</h2>
          </div>
          <div className="benefits-grid">
            {[
              { icon: <Brain />, title: "STAR Mastery", desc: "Learn to structure compelling, relevant answers that demonstrate clear impact." },
              { icon: <Mic />, title: "Voice & Tone", desc: "Improve pace, tone, and clarity to leave a lasting positive professional impression." },
              { icon: <Lightbulb />, title: "Real Scenarios", desc: "Practice with realistic mock sessions tailored to your specific target roles." },
              { icon: <Award />, title: "Anxiety Management", desc: "Repeated practice in a safe environment helps eliminate real-world interview jitters." },
              { icon: <MessageSquare />, title: "Actionable Feedback", desc: "Detailed, personalized feedback after every single session to accelerate growth." },
              { icon: <Users />, title: "Client Readiness", desc: "We ensure you're not just prepared for the job, but prepared to win the job." }
            ].map((b, i) => (
              <div key={i} className="benefit-card">
                <div className="icon-wrap">{b.icon}</div>
                <h3>{b.title}</h3>
                <p style={{ color: '#475569', lineHeight: 1.6 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="content-section">
        <div className="container-v2" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span className="tag-v2">More Information</span>
            <h2 className="title-v2">Frequently Asked Questions</h2>
          </div>
          {[
            { q: "How many mock interviews do I get?", a: "Typically 4–6 mock interviews per month. Each session is tailored to your target roles and preparation needs." },
            { q: "Can you prepare me for technical interviews?", a: "Yes! We cover both behavioral and technical interviews, providing frameworks and live question support." },
            { q: "How long is each mock session?", a: "Usually 45–60 minutes: 30 min interview, followed by 20 min of detailed feedback." },
            { q: "What if I have an interview coming up soon?", a: "We offer crash courses! We can do intensive 1–2 week preparation if you have a confirmed client call." }
          ].map((faq, i) => (
            <div key={i} className="it-faq-item">
              <button className="it-faq-btn" onClick={() => setExpandedFaq(expandedFaq === i ? -1 : i)}>
                <h3>{faq.q}</h3>
                <ChevronDown size={22} style={{ color: "#2563eb", transform: expandedFaq === i ? "rotate(180deg)" : "none", transition: "0.4s" }} />
              </button>
              {expandedFaq === i && <div className="it-faq-body">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="cta-content">
          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '24px' }}>Walk into your next interview with confidence.</h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '40px', opacity: 0.9 }}>
            Stop guessing and start preparing with the platform that treats your career as our top priority.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-premium-v2" onClick={() => navigate('/contact')}>
              Start Preparation <Sparkles size={20} />
            </button>
            <button className="btn-outline-v2" onClick={() => window.open("https://cal.com/hyrind", "_blank")}>
              Talk to a Coach
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
