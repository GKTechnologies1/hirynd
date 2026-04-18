import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Target, TrendingUp, Users, Zap, BarChart3, Lock, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

export default function ProfileMarketing() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.paddingTop = "80px";
    return () => { document.body.style.paddingTop = "0px"; };
  }, []);

  const features = [
    "Dedicated Recruiter Assignment",
    "Strategic Resume Optimization",
    "Role-Based Direct Submissions",
    "Monthly Marketing Campaigns",
    "Real-time CRM Progress Tracking",
    "Direct recruiter outreach to hiring managers on your behalf",
    "LinkedIn profile review and optimization",
    "Daily application logs visible in your candidate portal",
    "Progress reports and weekly recruiter check-ins"
  ];

  return (
    <div className="service-detail-page">
      <SEO 
        title="Recruiter-Led Profile Marketing | HYRIND" 
        description="Our Profile Marketing service goes beyond traditional job applications. We leverage our extensive network of industry connections and proven marketing strategies to ensure your profile reaches the right decision-makers." 
        path="/services/profile-marketing" 
      />
      <Header />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .service-detail-page {
          font-family: 'Outfit', sans-serif;
          background-color: #fcfdfe;
          color: #0f172a;
          overflow-x: hidden;
        }

        /* Hero matching Services.jsx */
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

        /* Buttons matching premium system */
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

        /* Content Sections */
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

        /* Benefits Grid */
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
          position: relative;
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

        .benefit-card h3 {
          font-size: 1.4rem;
          font-weight: 800;
          margin-bottom: 15px;
        }

        /* Split Section */
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

        .check-icon {
          color: #2563eb;
          flex-shrink: 0;
        }

        /* Final CTA */
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

      {/* Hero */}
      <section className="service-hero">
        <div className="hero-content">
          <div className="hero-badge">Most Popular Service</div>
          <h1>Recruiter-Led Profile Marketing</h1>
          <p>
            Our Profile Marketing service goes beyond traditional job applications. We leverage our extensive network of industry connections and proven marketing strategies to ensure your profile reaches the right decision-makers.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-premium-v2" onClick={() => navigate('/contact')}>
              Get Started Today <ArrowRight size={20} />
            </button>
            <button className="btn-outline-v2" onClick={() => window.open("https://cal.com/hyrind", "_blank")}>
              Book a Strategy Call
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="content-section">
        <div className="container-v2">
          <div className="split-section">
            <div>
              <span className="tag-v2">Comprehensive Support</span>
              <h2 className="title-v2">Everything You Need to Succeed</h2>
              <p className="desc-v2">
                With personalized recruiter support, your profile is carefully tailored for each opportunity, highlighting your unique strengths and ensuring all outreach is directed toward meaningful opportunities.
              </p>
              <ul className="feature-list">
                {features.map((f, i) => (
                  <li key={i} className="feature-item">
                    <CheckCircle2 className="check-icon" size={24} /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ position: 'relative' }}>
              <div className="floating-icon">
                <Target size={50} color="white" />
              </div>
              <img 
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80" 
                alt="Profile Marketing" 
                style={{ borderRadius: '40px', width: '100%', boxShadow: '0 40px 80px rgba(13,71,161,0.15)' }} 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="content-section" style={{ background: '#f8fafc' }}>
        <div className="container-v2">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <span className="tag-v2">The HYRIND Advantage</span>
            <h2 className="title-v2">Why Choose Recruiter-Led Marketing?</h2>
          </div>
          <div className="benefits-grid">
            {[
              { icon: <TrendingUp />, title: "Precision Targeting", desc: "We match your profile to roles where you're highly competitive, not just any opening." },
              { icon: <Users />, title: "Network Access", desc: "Leverage our extensive network of hiring managers and recruiters in your target companies." },
              { icon: <Zap />, title: "Higher Response Rate", desc: "Recruiter-driven submissions increase callback rates significantly compared to solo job hunting." },
              { icon: <BarChart3 />, title: "Data-Driven Results", desc: "Weekly analytics showing submission metrics, response rates, and market insights." },
              { icon: <Lock />, title: "CRM Transparency", desc: "Track every application, feedback, and interaction in real-time through your portal." },
              { icon: <Sparkles />, title: "Professional Polish", desc: "From LinkedIn to Resumes, we ensure your professional brand is elite across all platforms." }
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

      {/* Final CTA */}
      <section className="final-cta">
        <div className="cta-content">
          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '24px' }}>Ready to Secure Your Next Role?</h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '40px', opacity: 0.9 }}>
            Join the community of HYRIND candidates who are currently receiving real interview opportunities and recruiter callbacks.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-premium-v2" onClick={() => navigate('/contact')}>
              Apply Now <Sparkles size={20} />
            </button>
            <button className="btn-outline-v2" onClick={() => window.open("https://cal.com/hyrind", "_blank")}>
              Talk to a Recruiter
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
