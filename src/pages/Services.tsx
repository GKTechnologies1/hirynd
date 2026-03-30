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
        // Delay slightly for render completion
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
      icon: <Target className="w-10 h-10" />,
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
      icon: <Mic className="w-10 h-10" />,
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
      icon: <GraduationCap className="w-10 h-10" />,
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
    <div className="services-page-v2 bg-white min-h-screen">
      <SEO title="Our Services | HYRIND" description="Strategic career solutions that combine profile marketing, preparation, and recruiter support to help you move forward with confidence." path="/services" />
      <Header />
      
      <style>{`
        .services-hero-v2 {
          background: radial-gradient(circle at top right, #1e40af, #0d47a1);
          color: white;
          padding: 120px 24px 80px;
          text-align: center;
          position: relative;
        }

        .hero-title-v2 {
          font-size: clamp(3rem, 8vw, 4.5rem);
          font-weight: 800;
          margin-bottom: 24px;
        }

        .service-badge-v2 {
          background: #eff6ff;
          color: #2563eb;
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .service-title-v2 {
          font-size: 2.5rem;
          font-weight: 800;
          color: #0d47a1;
          margin-bottom: 24px;
        }

        .service-row-v2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          margin-bottom: 100px;
        }

        @media (max-width: 991px) {
          .service-row-v2 {
            grid-template-columns: 1fr;
            text-align: center;
          }
        }

        .image-wrapper-v2 {
          border-radius: 40px;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(13, 71, 161, 0.15);
        }

        .btn-premium-v2 {
          background: #0d47a1;
          color: white;
          padding: 18px 40px;
          border-radius: 15px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s ease;
        }

        .btn-premium-v2:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(13, 71, 161, 0.3);
        }
      `}</style>

      <main>
        <section className="services-hero-v2">
          <div className="max-w-4xl mx-auto">
            <h1 className="hero-title-v2">Our Career Services</h1>
            <p className="text-xl opacity-90">
              Strategic career solutions that combine profile marketing, preparation, and recruiter support.
            </p>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            {services.map((service, index) => (
              <div key={service.id} id={service.anchor} className="service-row-v2" style={{ direction: index % 2 === 0 ? 'ltr' : 'rtl' }}>
                 <div style={{ direction: 'ltr' }}>
                    <span className="service-badge-v2">{service.badge}</span>
                    <h2 className="service-title-v2 mt-4">{service.title}</h2>
                    <p className="text-lg text-gray-600 mb-8">{service.longDesc}</p>
                    <ul className="mb-8 space-y-3">
                      {service.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-3 font-medium text-gray-800">
                          <CheckCircle2 className="text-blue-600" /> {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => navigate('/candidate-login')} className="btn-premium-v2">
                      Get Started Today <ArrowRight size={20} />
                    </button>
                 </div>
                 <div className="image-wrapper-v2">
                    <img src={service.image} alt={service.title} className="w-full h-auto object-cover" />
                 </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 bg-blue-900 text-white text-center mx-6 my-10 rounded-[60px]">
           <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-4xl font-extrabold mb-6">Ready to Secure Your Next Role?</h2>
              <p className="text-xl opacity-90 mb-10">Join the elite community of HYRIND candidates who are currently receiving real interview opportunities.</p>
              <div className="flex justify-center gap-4 flex-wrap">
                 <button onClick={() => navigate('/candidate-login')} className="bg-white text-blue-900 px-10 py-4 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                    Register Now <Rocket size={20} />
                 </button>
                 <button onClick={() => navigate('/contact')} className="border-2 border-white text-white px-10 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-white hover:text-blue-900 transition-all">
                    Submit Interest <Sparkles size={20} />
                 </button>
              </div>
           </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Services;
