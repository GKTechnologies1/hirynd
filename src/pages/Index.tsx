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
    link: '/services#profile-marketing'
  },
  {
    title: 'Interview & Screening Call Training',
    description: 'Mock calls • Voice & communication improvement • Technical prep • Detailed feedback',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
    link: '/services#interview-practice'
  },
  {
    title: 'Skills Training Program',
    description: 'Role-based skill roadmap • Google Drive resources • Trainer sessions • Real project guidance',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
    link: '/services#skills-training'
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
      <SEO title="HYRIND — Focus on Skills. Let Us Handle the Rest." description="Recruiter-led profile marketing, resume optimization, daily job submissions, and interview preparation for job seekers in the U.S." path="/" />
      <Header />
      
      <style>{`
        .hero-section {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          position: relative;
          overflow: hidden;
          padding: 5rem 2rem;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2);
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
        
        .step-icon-wrap-custom {
          width: 80px;
          height: 80px;
          background: #ffffff;
          border: 3px solid #3b82f6;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          color: #1e40af;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.15);
          position: relative;
        }

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
              <span className="block font-extrabold">Focus on Skills</span>
              <span className="block text-yellow-400 font-semibold">Let Us Handle the Rest</span>
            </h1>
            <p className="hero-subtitle mb-8 max-w-3xl mx-auto">
              We Market Your Profile. You Focus on Your Career Growth. At HYRIND, we help candidates land full-time opportunities in the United States without the stress of self-marketing.
            </p>
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

        {/* Workflow Section */}
        <section className="py-20 bg-gray-50 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="section-tag">Our Workflow</span>
              <h2 className="section-title-custom">Simple Steps to Career Launch</h2>
            </div>

            <div className="grid md:grid-cols-5 gap-4 relative">
              {PROCESS_STEPS.map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="step-icon-wrap-custom group hover:bg-blue-900 hover:text-white transition-all">
                    <span className="absolute -top-3 -right-3 bg-yellow-400 text-blue-900 text-xs font-black px-2 py-1 rounded-md shadow-lg">
                      STEP 0{step.step}
                    </span>
                    <i className={step.icon}></i>
                  </div>
                  <h4 className="font-bold text-blue-900 mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-500">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section-custom">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-extrabold mb-4">Ready to Get More Interviews?</h2>
            <p className="text-xl opacity-90 mb-8">Join HYRIND and start receiving recruiter calls and real interview opportunities.</p>
            <div className="flex justify-center gap-4">
              <Link to="/contact" className="btn-custom btn-primary-custom">Submit Interest</Link>
              <button 
                onClick={() => window.open("https://cal.com/hyrind/15min?layout=mobile", "_blank")}
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
