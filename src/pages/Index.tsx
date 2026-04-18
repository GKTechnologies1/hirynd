import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";

const VALUE_PROPS = [
  {
    iconClass: 'bi bi-people-fill',
    title: 'Dedicated Recruiter Assigned to You',
    description:
      'A dedicated recruiter is assigned to manage your entire journey—from profile positioning to daily job submissions. Your recruiter actively markets your profile, optimizes resumes based on recruiter feedback, and continuously improves results based on response trends.',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80'
  },
  {
    iconClass: 'bi bi-card-checklist',
    title: 'Role-Based Resume & Skills Roadmap',
    description:
      'Your resume and skill roadmap are built around your exact target roles, not generic templates. Based on your intake sheet and industry goals, we create role-specific resumes, align them with job descriptions, and design a skill roadmap supported by curated learning resources to strengthen your profile continuously.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80'
  },
  {
    iconClass: 'bi bi-mic-fill',
    title: 'Interview & Screening Call Support',
    description:
      'We prepare you to represent yourself with confidence and clarity. Through mock screening calls, communication coaching, and behavioral and technical preparation, we help you present your experience effectively and professionally. Our goal is to ensure you are fully client-ready—confident, articulate, and well-prepared at every stage.',
    image: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&q=80'
  },
];

const SERVICES = [
  {
    title: 'Profile Marketing',
    description: 'Targeted submissions • Recruiter-driven applications • Custom resume & LinkedIn optimization • Progress tracking',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    link: '/services/profile-marketing'
  },
  {
    title: 'Interview & Screening Call Training',
    description: 'Mock calls • Voice & communication improvement • Technical prep • Detailed feedback',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
    link: '/services/interview-training'
  },
  {
    title: 'Skills Training Program',
    description: 'Role-based skill roadmap • Google Drive resources • Trainer sessions • Real project guidance',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
    link: '/services/skills-training'
  }
];

const PROCESS_STEPS = [
  { step: 1, title: 'Explore HYRIND & Submit Interest', detail: 'Submit initial interest and upload your basic details.', icon: 'bi bi-search' },
  { step: 2, title: 'Intro Call with HYRIND Team', detail: 'We explain process, timelines, and expectations.', icon: 'bi bi-telephone' },
  { step: 3, title: 'Approval & Role Alignment', detail: 'Once approved, we align on your target roles.', icon: 'bi bi-check-circle' },
  { step: 4, title: 'Profile Setup & Preparation', detail: 'Complete documents and begin prep sessions.', icon: 'bi bi-person-badge' },
  { step: 5, title: 'Marketing, Training & Interview Support', detail: 'Daily submissions start with ongoing training.', icon: 'bi bi-rocket-takeoff' },
];

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Inject Bootstrap for the specific designs used in the source repo
    if (!document.getElementById('bootstrap-css')) {
      const link = document.createElement('link');
      link.id = 'bootstrap-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('bootstrap-icons')) {
      const linkIcons = document.createElement('link');
      linkIcons.id = 'bootstrap-icons';
      linkIcons.rel = 'stylesheet';
      linkIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
      document.head.appendChild(linkIcons);
    }

    // Body padding to accommodate fixed navbar
    document.body.style.paddingTop = '80px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SEO title="HYRIND — Focus on Skills. Let Us Handle the Rest." description="Recruiter-led profile marketing, resume optimization, job submissions, and interview preparation for candidates across the U.S." path="/" />
      <Header />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .home-wrapper {
          font-family: 'Outfit', sans-serif;
        }

        .hero-section {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          position: relative;
          overflow: hidden;
          padding: 5rem 2rem;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2);
        }
        
        .hero-section::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: url('https://www.transparenttextures.com/patterns/cubes.png');
          opacity: 0.05;
          pointer-events: none;
        }
        
        .hero-content {
          position: relative;
          z-index: 1;
          animation: fadeInUp 0.8s ease-out;
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .hero-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 1.5rem;
          color: #ffffff;
        }
        
        .hero-subtitle {
          font-size: clamp(1rem, 2.5vw, 1.25rem);
          line-height: 1.6;
          opacity: 0.95;
          color: #ffffff;
        }
        
        .btn-custom {
          padding: 1rem 2.5rem;
          font-weight: 600;
          border-radius: 15px;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
          border: none;
        }
        
        .btn-primary-custom {
          background: #ffffff;
          color: #1e40af;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }
        
        .btn-primary-custom:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 15px 40px rgba(59, 130, 246, 0.3);
          color: #1e40af;
        }
        
        .btn-outline-custom {
          background: transparent;
          color: white;
          border: 2px solid #ffffff;
          position: relative;
          overflow: hidden;
        }
        
        .section-tag {
          color: #3b82f6;
          font-weight: 700;
          font-size: 0.875rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        
        .section-title-custom {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          color: #1e40af;
          margin-top: 0.5rem;
        }
        
        .value-section {
          background: #f8fafc;
          padding: 5rem 2rem;
        }
        
        .value-card-custom {
          background: #ffffff;
          border: 2px solid #3b82f6;
          border-radius: 15px;
          padding: 2rem;
          height: 100%;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.1);
          position: relative;
          overflow: hidden;
        }
        
        .value-card-custom:hover {
          transform: translateY(-15px) scale(1.02);
          box-shadow: 0 20px 50px rgba(59, 130, 246, 0.3);
          border-color: #1e40af;
        }
        
        .value-icon-custom {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          font-size: 2rem;
          color: white;
        }
        
        .value-image-custom {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 10px;
          margin: 1rem 0;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        /* == Workflow Timeline == */
        .workflow-section {
          background: #f0f6ff;
          padding: 5rem 2rem;
          overflow: hidden;
        }

        .timeline-wrapper {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0;
          position: relative;
          flex-wrap: nowrap;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex: 1;
          min-width: 0;
          position: relative;
          z-index: 1;
        }

        .timeline-node {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: #fff;
          box-shadow: 0 8px 24px rgba(59,130,246,0.35);
          flex-shrink: 0;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
        }

        .timeline-node:hover {
          transform: scale(1.12);
          box-shadow: 0 16px 40px rgba(59,130,246,0.5);
        }

        .timeline-step-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 22px;
          height: 22px;
          background: #facc15;
          color: #1e40af;
          font-size: 0.65rem;
          font-weight: 900;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .timeline-connector {
          flex: 1;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #93c5fd);
          margin-top: 35px;
          position: relative;
          min-width: 20px;
        }

        .timeline-connector::after {
          content: '';
          position: absolute;
          right: -8px;
          top: 50%;
          transform: translateY(-50%);
          border-left: 9px solid #93c5fd;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
        }

        .timeline-label {
          margin-top: 1rem;
          padding: 0 0.5rem;
        }

        .timeline-label h4 {
          font-size: 0.82rem;
          font-weight: 800;
          color: #1e40af;
          margin-bottom: 0.3rem;
          line-height: 1.3;
        }

        .timeline-label p {
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.4;
        }

        /* Mobile: vertical compact stack */
        @media (max-width: 768px) {
          .timeline-wrapper {
            flex-direction: column;
            align-items: center;
            gap: 0;
          }
          .timeline-connector {
            width: 3px;
            height: 32px;
            min-width: unset;
            background: linear-gradient(180deg, #3b82f6, #93c5fd);
            margin-top: 0;
            margin-left: 35px;
            align-self: flex-start;
          }
          .timeline-connector::after {
            right: unset;
            top: unset;
            left: 50%;
            bottom: -8px;
            transform: translateX(-50%);
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 9px solid #93c5fd;
            border-bottom: none;
          }
          .timeline-step {
            flex-direction: row;
            text-align: left;
            gap: 1rem;
            width: 100%;
            max-width: 320px;
          }
          .timeline-label {
            margin-top: 0;
            padding: 0;
          }
        }

        /* == Brand Belief Line == */
        .belief-line {
          margin-top: 3.5rem;
          text-align: center;
          font-size: clamp(0.95rem, 2vw, 1.1rem);
          font-style: italic;
          color: #1e40af;
          font-weight: 600;
          position: relative;
          padding: 1.25rem 2rem;
          border-top: 2px solid #bfdbfe;
          border-bottom: 2px solid #bfdbfe;
          letter-spacing: 0.01em;
        }


        /* == CTA Section == */
        .cta-section-custom {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          padding: 5rem 2rem;
          text-align: center;
          color: white;
        }
      `}</style>

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="container hero-content text-center">
            <h1 className="hero-title">
              <span className="block" style={{ fontWeight: 900 }}>Focus on Skills</span>
              <span className="block text-yellow-400" style={{ fontWeight: 600 }}>Let Us Handle the Rest</span>
            </h1>
            <p className="hero-subtitle mb-4 max-w-3xl mx-auto" style={{ fontWeight: 600, fontSize: 'clamp(1.05rem, 2.5vw, 1.3rem)' }}>
              We Market Your Profile. You Focus on Your Career Growth.
            </p>
            <div className="hero-subtitle mb-8 max-w-3xl mx-auto text-left" style={{ opacity: 0.9 }}>
              <p className="mb-3">
                At HYRIND, we help candidates land full-time opportunities in the United States without the stress of self-marketing. Our recruiter-led platform manages profile marketing, resume optimization, job submissions, recruiter outreach, screening call preparation, and end-to-end job search support.
              </p>
              <p>
                We support students, early-career professionals, and experienced candidates across the U.S. by combining expert profile marketing, role-based skills training, and real-time interview evaluation — ensuring every candidate is positioned for the right opportunity at the right time.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link to="/contact" className="btn-custom btn-primary-custom">
                Submit Interest Form
              </Link>
              <button
                onClick={() => window.open("https://cal.com/hyrind/15min?layout=mobile", "_blank")}
                className="btn-custom btn-outline-custom"
              >
                Book a Free Consultation
              </button>
            </div>
          </div>
        </section>

        {/* Value Propositions */}
        <section className="value-section">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="section-tag">Why HYRIND</span>
              <h2 className="section-title-custom">Why Candidates Trust HYRIND</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {VALUE_PROPS.map((prop, index) => (
                <div key={index} className="value-card-custom group">
                  <div className="value-icon-custom group-hover:rotate-12 transition-transform">
                    <i className={prop.iconClass}></i>
                  </div>
                  <h3 className="text-xl font-bold text-blue-900 mb-4 text-center">{prop.title}</h3>
                  <img src={prop.image} alt={prop.title} className="value-image-custom" />
                  <p className="text-gray-600 text-center leading-relaxed">{prop.description}</p>
                </div>
              ))}
            </div>

            {/* Brand Belief Line */}
            <p className="belief-line">
              We believe in doing the right thing, in the right way, at the right time — to deliver the right results.
            </p>
          </div>
        </section>

        {/* Services Overview */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="section-tag">What We Offer</span>
              <h2 className="section-title-custom">The Three Services We Provide</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {SERVICES.map((service, index) => (
                <div key={index} className="value-card-custom text-center">
                  <img src={service.image} alt={service.title} className="value-image-custom mb-6" />
                  <h3 className="text-xl font-bold text-blue-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 mb-6">{service.description}</p>
                  <Link to={service.link} className="btn-custom btn-primary-custom w-full">
                    Learn More →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section – Horizontal Timeline */}
        <section className="workflow-section">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <span className="section-tag">Our Workflow</span>
              <h2 className="section-title-custom">Simple Steps to Career Launch</h2>
            </div>

            <div className="timeline-wrapper">
              {PROCESS_STEPS.map((step, index) => (
                <React.Fragment key={index}>
                  <div className="timeline-step">
                    <div className="timeline-node">
                      <span className="timeline-step-badge">{step.step}</span>
                      <i className={step.icon} style={{ fontSize: '1.4rem' }}></i>
                    </div>
                    <div className="timeline-label">
                      <h4>{step.title}</h4>
                      <p>{step.detail}</p>
                    </div>
                  </div>
                  {index < PROCESS_STEPS.length - 1 && (
                    <div className="timeline-connector" aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section-custom">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-extrabold mb-4">Ready to Get More Interviews?</h2>
            <p className="text-xl opacity-90 mb-8">Join HYRIND and start receiving recruiter calls and real interview opportunities.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-custom btn-primary-custom">Submit Interest</Link>
              <button
                onClick={() => window.open("https://cal.com/hyrind", "_blank")}
                className="btn-custom btn-outline-custom"
              >
                Book a Call
              </button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;
