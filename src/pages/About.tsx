import React, { useEffect } from 'react';
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Link } from 'react-router-dom';

const About = () => {
    useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
    document.head.appendChild(link);
    
    document.body.style.paddingTop = '80px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  return (
    <div className="about-page bg-white min-h-screen">
      <SEO title="About Us | HYRIND" description="HYRIND is a talent marketing and job support platform built to bridge the gap between skills and employment." path="/about" />
      <Header />
      
      <style>{`
        .about-page {
          overflow-x: hidden;
        }

        /* Hero Section */
        .hero-section-about {
          padding: 100px 0 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
          min-height: 500px;
          display: flex;
          align-items: center;
        }

        .hero-bg-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .hero-title-about {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 20px;
          color: #ffffff;
          animation: fadeInDown 0.8s ease-out;
        }

        .hero-description {
          font-size: 1.25rem;
          line-height: 1.8;
          color: #ffffff;
          max-width: 800px;
          margin: 0 auto;
          animation: fadeInUp 0.8s ease-out 0.2s backwards;
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Section Styling */
        .section-title-blue {
          font-size: 2.5rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 50px;
          color: #1976d2;
          position: relative;
        }

        .section-title-blue::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 4px;
          background: linear-gradient(90deg, #2196f3, #1976d2);
          border-radius: 2px;
        }

        .serve-section {
          padding: 80px 0;
          background: #f8fafc;
        }

        .serve-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        @media (min-width: 1024px) {
          .serve-grid > *:last-child:nth-child(4) {
             grid-column: 2;
          }
        }

        @media (max-width: 1023px) {
          .serve-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .serve-grid {
            grid-template-columns: 1fr;
          }
        }

        .serve-card {
          background: #ffffff;
          border: 2px solid #2196f3;
          border-radius: 12px;
          padding: 0;
          text-align: center;
          transition: all 0.4s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .serve-card:hover {
          transform: translateY(-12px);
          box-shadow: 0 20px 40px rgba(33, 150, 243, 0.25);
          border-color: #1976d2;
        }

        .serve-image-wrapper {
          width: 100%;
          height: 220px;
          overflow: hidden;
        }

        .serve-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .serve-card:hover .serve-image {
          transform: scale(1.1);
        }

        .serve-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1976d2;
          padding: 25px 20px;
        }

        .mission-section-v2 {
          padding: 100px 0;
          background: #ffffff;
        }

        .mission-grid-v2 {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 60px;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .mission-badge-v2 {
          display: inline-block;
          padding: 8px 20px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 50px;
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
        }

        .mission-title-v2 {
          font-size: 3rem;
          font-weight: 800;
          color: #0d47a1;
          margin-bottom: 30px;
        }

        .mission-text-v2 {
          font-size: 1.3rem;
          line-height: 1.6;
          color: #374151;
        }

        .mission-text-v2 strong {
          color: #1976d2;
          font-weight: 700;
        }

        .main-image-v2 {
          width: 100%;
          border-radius: 30px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.15);
        }

        .approach-section {
          padding: 80px 0;
          background: #f8fafc;
        }

        .approach-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        @media (min-width: 1024px) {
          .approach-grid > *:last-child:nth-child(4) {
             grid-column: 2;
          }
        }

        @media (max-width: 1023px) {
          .approach-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .approach-grid {
            grid-template-columns: 1fr;
          }
        }

        .approach-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 40px 25px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }

        .approach-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 16px 36px rgba(33, 150, 243, 0.2);
        }

        .icon-wrapper-about {
          width: 70px;
          height: 70px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 2rem;
        }

        .cta-section-about {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          padding: 80px 0;
          text-align: center;
          color: white;
        }

        .cta-button {
          display: inline-block;
          background: white;
          color: #1e40af;
          padding: 15px 40px;
          border-radius: 10px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .cta-button:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      <main>
        {/* Hero Section */}
        <section className="hero-section-about">
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80"
            alt="Team collaboration"
            className="hero-bg-image"
          />
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h1 className="hero-title-about">About Us</h1>
            <p className="hero-description text-center mx-auto">
              HYRIND is a talent marketing and job support platform built to bridge the gap between skills
              and employment. While our core audience includes international students and early-career
              professionals, we support any job seeker looking to market their profile effectively and secure
              full-time opportunities in the U.S.
            </p>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="serve-section">
          <div className="container mx-auto">
            <h2 className="section-title-blue">Who We Serve</h2>
            <div className="serve-grid">
              <div className="serve-card">
                <div className="serve-image-wrapper">
                  <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80" alt="Students" className="serve-image" />
                </div>
                <h3>International Students (F1 / OPT / STEM OPT)</h3>
              </div>
              <div className="serve-card">
                <div className="serve-image-wrapper">
                  <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80" alt="Graduates" className="serve-image" />
                </div>
                <h3>Graduates</h3>
              </div>
              <div className="serve-card">
                <div className="serve-image-wrapper">
                  <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80" alt="Professionals" className="serve-image" />
                </div>
                <h3>Early & Mid-Career Professionals</h3>
              </div>
              <div className="serve-card">
                <div className="serve-image-wrapper">
                  <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80" alt="Job Seekers" className="serve-image" />
                </div>
                <h3>Job Seekers Seeking Structured Job Support</h3>
              </div>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section className="mission-section-v2">
          <div className="mission-grid-v2">
            <div className="mission-content-v2">
              <span className="mission-badge-v2">Purpose Driven</span>
              <h2 className="mission-title-v2">Our Mission</h2>
              <p className="mission-text-v2">
                Our mission is to empower job seekers with the <strong>tools, support, and representation</strong> they need to
                secure interviews and meaningful career opportunities - so they can focus on <strong>building skills</strong> while we focus on <strong>marketing their profile.</strong>
              </p>
            </div>
            <div className="mission-visual-v2">
              <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80" alt="Mission" className="main-image-v2" />
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="approach-section">
          <div className="container mx-auto">
            <h2 className="section-title-blue">Our Approach</h2>
            <div className="approach-grid">
              <div className="approach-card">
                <div className="icon-wrapper-about">
                    <i className="bi bi-people"></i>
                </div>
                <h3 className="text-xl font-bold text-blue-700 mb-2">Recruiter-Driven Support</h3>
                <p className="text-gray-600">Expert guidance from our recurring team who actively market your profile.</p>
              </div>
              <div className="approach-card">
                <div className="icon-wrapper-about">
                    <i className="bi bi-map"></i>
                </div>
                <h3 className="text-xl font-bold text-blue-700 mb-2">Personalized Roadmap</h3>
                <p className="text-gray-600">Your career journey mapped out with role-based goals and clear timelines.</p>
              </div>
              <div className="approach-card">
                <div className="icon-wrapper-about">
                    <i className="bi bi-mortarboard"></i>
                </div>
                <h3 className="text-xl font-bold text-blue-700 mb-2">Hands-On Training</h3>
                <p className="text-gray-600">Intensive mock calls and role-specific training sessions to make you client-ready.</p>
              </div>
              <div className="approach-card">
                <div className="icon-wrapper-about">
                    <i className="bi bi-briefcase"></i>
                </div>
                <h3 className="text-xl font-bold text-blue-700 mb-2">Job Process Support</h3>
                <p className="text-gray-600">From profile setup to final job offer, we handle the logistics of your search.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section-about">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-extrabold mb-4">Ready to Launch Your Career?</h2>
            <p className="text-xl opacity-90 mb-8">Join HYRIND today and take the first step towards securing your dream job in the US.</p>
            <div className="flex justify-center gap-4">
              <Link to="/candidate-login" className="cta-button">Get Started</Link>
              <Link to="/contact" className="cta-button" style={{ background: 'transparent', border: '2px solid white', color: 'white' }}>Interest Form</Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
