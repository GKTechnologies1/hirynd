import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import {
  Target,
  Mic,
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Rocket
} from 'lucide-react';

const Services = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
    document.body.style.paddingTop = '80px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, [window.location.hash]);

  const services = [
    {
      id: 1,
      anchor: "profile-marketing",
      title: "Recruiter-Led Profile Marketing",
      badge: "Most Popular",
      icon: <Target />,
      description: "Strategic marketing of your profile to potential employers with dedicated recruiter assignment and role-based submissions.",
      longDesc: "Our Profile Marketing service goes beyond traditional job applications. We leverage our extensive network of industry connections and proven marketing strategies to ensure your profile reaches the right decision-makers. With personalized recruiter support, your resume is carefully tailored for each opportunity, highlighting your unique strengths and experiences.",
      features: [
        "Dedicated Recruiter Assignment",
        "Strategic Resume Optimization",
        "Role-Based Direct Submissions",
        "Monthly Marketing Campaigns",
        "Real-time CRM Progress Tracking"
      ],
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
      accent: "#2563eb"
    },
    {
      id: 2,
      anchor: "interview-practice",
      title: "Interview & Screening Practice",
      badge: "High Impact",
      icon: <Mic />,
      description: "Comprehensive mock interviews and screening call preparation with detailed real-time feedback from industry professionals.",
      longDesc: "Success in interviews requires more than just technical knowledge—it demands confidence and clear communication. Our sessions replicate real-world scenarios with experienced professionals who provide actionable feedback. We help you master the STAR method and handle behavioral questions with ease.",
      features: [
        "Mock Client Call Simulations",
        "Real-Time Constructive Feedback",
        "Communication & Presence Coaching",
        "STAR Method & Behavioral Training",
        "Confidence & Anxiety Management"
      ],
      image: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&q=80",
      accent: "#0d47a1"
    },
    {
      id: 3,
      anchor: "skills-training",
      title: "Role-Based Skills Training",
      badge: "Strategic",
      icon: <GraduationCap />,
      description: "Development with curated learning paths and weekly training tasks designed to meet specific job market demands.",
      longDesc: "The tech landscape evolves rapidly. Our Skills Training program offers customized learning paths designed specifically for your target roles and career goals. You'll receive weekly training tasks that build practical skills and create portfolio-worthy projects verified by experts.",
      features: [
        "Role-Specific Skill Roadmaps",
        "Curated Recruiter Resources",
        "Weekly Practical Training Tasks",
        "Portfolio Project Guidance",
        "Milestone Progress Tracking"
      ],
      image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
      accent: "#3b82f6"
    }
  ];

  return (
    <div className="services-page-v2">
      <SEO title="Our Career Services | HYRIND" description="Strategic career solutions that combine profile marketing, preparation, and recruiter support to help any job seeker in the U.S. move forward with confidence." path="/services" />
      <Header />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .services-page-v2 {
          background-color: #fcfdfe;
          color: #1e293b;
          font-family: 'Outfit', sans-serif;
          overflow-x: hidden;
        }

        /* Hero */
        .services-hero-v2 {
          background: radial-gradient(circle at top right, #1e40af, #0d47a1);
          color: white;
          padding: 160px 24px 100px;
          text-align: center;
          clip-path: ellipse(150% 100% at 50% 0%);
          position: relative;
        }

        .services-hero-v2::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: url('https://www.transparenttextures.com/patterns/cubes.png');
          opacity: 0.1;
          pointer-events: none;
        }

        .hero-content-v2 {
          max-width: 900px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .hero-title-v2 {
          font-size: clamp(3rem, 8vw, 4.5rem);
          font-weight: 800;
          margin-bottom: 24px;
          letter-spacing: -0.04em;
          line-height: 1.1;
        }

        .hero-subtitle-v2 {
          font-size: 1.25rem;
          opacity: 0.9;
          font-weight: 300;
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Intro Section */
        .services-intro-v2 {
          padding: 100px 24px;
          text-align: center;
          background: white;
        }

        .intro-container-v2 {
          max-width: 800px;
          margin: 0 auto;
        }

        .intro-text-v2 {
          font-size: 1.25rem;
          line-height: 1.8;
          color: #475569;
          font-weight: 400;
        }

        /* Services Grid */
        .services-main-grid-v2 {
          padding: 80px 24px;
          background: #f8fafc;
        }

        .services-container-v2 {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 120px;
        }

        .service-row-v2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          scroll-margin-top: 120px;
        }

        .service-row-v2:nth-child(even) {
          direction: rtl;
        }

        .service-row-v2:nth-child(even) .service-content-v2 {
          direction: ltr;
        }

        .service-content-v2 {
          position: relative;
        }

        .service-meta-v2 {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .service-badge-v2 {
          background: #eff6ff;
          color: #2563eb;
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .service-title-v2 {
          font-size: 2.75rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 24px;
          line-height: 1.2;
        }

        .service-desc-v2 {
          font-size: 1.15rem;
          line-height: 1.7;
          color: #475569;
          margin-bottom: 30px;
        }

        .feature-list-v2 {
          list-style: none;
          padding: 0;
          margin-bottom: 40px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feature-item-v2 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.1rem;
          color: #1e293b;
          font-weight: 500;
        }

        .check-icon-v2 {
          color: #2563eb;
          flex-shrink: 0;
        }

        .service-visual-v2 {
          position: relative;
        }

        .image-wrapper-v2 {
          border-radius: 40px;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(13, 71, 161, 0.15);
          aspect-ratio: 4/3;
        }

        .service-img-v2 {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.8s ease;
        }

        .service-visual-v2:hover .service-img-v2 {
          transform: scale(1.1);
        }

        .floating-icon-v2 {
          position: absolute;
          top: -30px;
          left: -30px;
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          color: #2563eb;
          z-index: 5;
          animation: floatAnimation 4s ease-in-out infinite;
        }

        @keyframes floatAnimation {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }

        /* Final CTA */
        .services-cta-v2 {
          margin: 100px 24px;
          background: linear-gradient(135deg, #0d47a1 0%, #1e40af 100%);
          padding: 120px 48px;
          border-radius: 60px;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .cta-inner-v2 {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .cta-title-v2 {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 24px;
        }

        .btn-premium-v2 {
          background: white;
          color: #0d47a1;
          padding: 20px 50px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 1.15rem;
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
          box-shadow: 0 30px 60px rgba(0,0,0,0.25);
        }

        @media (max-width: 991px) {
          .service-row-v2 {
            grid-template-columns: 1fr;
            gap: 60px;
            text-align: center;
          }
          .service-row-v2:nth-child(even) {
            direction: ltr;
          }
          .service-meta-v2 {
            justify-content: center;
          }
          .feature-item-v2 {
            justify-content: center;
          }
          .floating-icon-v2 {
            left: 50%;
            transform: translateX(-50%);
            top: -40px;
          }
          @keyframes floatAnimation {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-15px); }
          }
          .cta-title-v2 {
            font-size: 2.5rem;
          }
        }
      `}</style>

      {/* Hero */}
      <section className="services-hero-v2">
        <div className="hero-content-v2">
          <h1 className="hero-title-v2">Our Career Services</h1>
          <p className="hero-subtitle-v2">
            Strategic career solutions that combine profile marketing, preparation, and recruiter support to help you move forward with confidence.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="services-intro-v2">
        <div className="intro-container-v2">
          <p className="intro-text-v2" style={{ marginBottom: '24px' }}>
            At HYRIND, we don’t believe job searching should be stressful, confusing, or isolating. Our services are designed to support job seekers at every stage by combining recruiter-led profile marketing, interview preparation, and role-based skill development into a single, structured journey.
          </p>
          <p className="intro-text-v2">
            While many of our candidates are international students and early-career professionals, our services are built to support any job seeker in the United States who wants their profile marketed professionally and prepared correctly for real hiring processes.
          </p>
          <div style={{ height: '5px', width: '80px', background: 'linear-gradient(90deg, #2563eb, #0d47a1)', margin: '40px auto 0', borderRadius: '10px' }}></div>
        </div>
      </section>

      {/* Main Services */}
      <section className="services-main-grid-v2">
        <div className="services-container-v2">
          {services.map((service, index) => (
            <div key={service.id} id={service.anchor} className="service-row-v2">
              <div className="service-content-v2">
                <div className="service-meta-v2">
                  <span className="service-badge-v2">{service.badge}</span>
                </div>
                <h2 className="service-title-v2">{service.title}</h2>
                <p className="service-desc-v2">{service.longDesc}</p>
                <ul className="feature-list-v2">
                  {service.features.map((feature, fIndex) => (
                    <li key={fIndex} className="feature-item-v2">
                      <CheckCircle2 className="check-icon-v2" size={22} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="btn-premium-v2" style={{ background: '#0d47a1', color: 'white' }} onClick={() => navigate('/candidate-login')}>
                  Get Started Today <ArrowRight size={20} />
                </button>
              </div>

              <div className="service-visual-v2">
                <div className="floating-icon-v2">
                  {React.cloneElement(service.icon as React.ReactElement, { size: 36 })}
                </div>
                <div className="image-wrapper-v2">
                  <img src={service.image} alt={service.title} className="service-img-v2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="services-cta-v2">
        <div className="cta-inner-v2">
          <h2 className="cta-title-v2">Ready to Secure Your Next Role?</h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '40px', opacity: 0.9 }}>
            Join the elite community of HYRIND candidates who are currently receiving real interview opportunities and recruiter callbacks.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-premium-v2" onClick={() => navigate('/candidate-login')}>
              Register Now <Rocket size={22} />
            </button>
            <button
              className="btn-premium-v2"
              style={{ background: 'transparent', color: 'white', border: '2px solid white' }}
              onClick={() => navigate('/contact')}
            >
              Submit Interest <Sparkles size={22} />
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;
