import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <>
      <style>
        {`
          .footer-custom {
            background-color: #0d47a1;
            color: white;
            padding: 80px 30px 40px;
            font-family: Arial, sans-serif;
          }

          .footer-container-custom {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 50px;
            margin-bottom: 50px;
          }

          .footer-title-custom {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 25px;
            color: white;
          }

          .footer-link-custom {
            margin-bottom: 15px;
            font-size: 15px;
          }

          .footer-link-custom a {
            color: #e0e8ff !important;
            text-decoration: none;
            transition: 0.3s;
          }

          .footer-link-custom a:hover {
            color: #ffeb3b !important;
            padding-left: 5px;
          }

          .qr-box-custom {
            width: 150px;
            height: 150px;
            background: white;
            padding: 10px;
            border-radius: 12px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }

          .contact-item-custom {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 15px;
            font-size: 15px;
            color: #e0e8ff;
          }

          .contact-item-custom a {
            color: inherit;
            text-decoration: none;
          }

          .social-icons-custom {
            display: flex;
            gap: 20px;
            margin-top: 20px;
          }

          .social-icon-btn {
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.3s;
            color: white;
          }

          .social-icon-btn:hover {
            background: #ffeb3b;
            color: #0d47a1;
            transform: translateY(-5px);
          }

          .footer-bottom-custom {
            text-align: center;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 30px;
            font-size: 14px;
            color: #dce6ff;
            max-width: 1200px;
            margin: 0 auto;
          }
        `}
      </style>

      <footer className="footer-custom">
        <div className="footer-container-custom">

          {/* Quick Links */}
          <div>
            <h3 className="footer-title-custom">Quick Links</h3>
            <div className="footer-link-custom"><Link to="/">Home</Link></div>
            <div className="footer-link-custom"><Link to="/about">About Us</Link></div>
            <div className="footer-link-custom"><Link to="/services">Services</Link></div>
            <div className="footer-link-custom"><Link to="/how-it-works">How it works</Link></div>
            <div className="footer-link-custom"><Link to="/reviews">Reviews</Link></div>
            <div className="footer-link-custom"><Link to="/contact">Contact us</Link></div>
          </div>

          {/* Our Solutions */}
          <div>
            <h3 className="footer-title-custom">Our Solutions</h3>
            <p className="footer-link-custom" style={{color: '#e0e8ff'}}>End-to-End Job Search Support</p>
            <p className="footer-link-custom" style={{color: '#e0e8ff'}}>Recruiter-Led Profile Marketing</p>
            <p className="footer-link-custom" style={{color: '#e0e8ff'}}>Resume Optimization</p>
            <p className="footer-link-custom" style={{color: '#e0e8ff'}}>Interview & Screening Prep</p>
            <p className="footer-link-custom" style={{color: '#e0e8ff'}}>Secure Data Handling</p>
          </div>

          {/* QR Code */}
          <div>
            <h3 className="footer-title-custom">Scan & Connect</h3>
            <div className="qr-box-custom">
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(window.location.origin + "/scan-connect")}`}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                />
            </div>
            <p style={{ marginTop: "15px", fontSize: "14px", color: '#e0e8ff' }}>Stay updated with job tips!</p>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="footer-title-custom">Contact</h3>
            <div className="contact-item-custom">
              <Mail size={18} /> <a href="mailto:support@hyrind.com">support@hyrind.com</a>
            </div>
            <div className="contact-item-custom">
              <Phone size={18} /> <a href="tel:3143540634">314-354-0634</a>
            </div>

            <h3 className="footer-title-custom" style={{ marginTop: "30px" }}>Social Media</h3>
            <div className="social-icons-custom">
              <a href="https://www.instagram.com/hyrind_usa/" target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                <Instagram size={20} />
              </a>
              <a href="https://www.linkedin.com/company/hyrind/" target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom-custom">
          © {new Date().getFullYear()} HYRIND. All Rights Reserved |
          <Link to="/privacy-policy" style={{ color: "#dce6ff", margin: "0 10px" }}>Privacy Policy</Link> |
          <Link to="/terms" style={{ color: "#dce6ff", margin: "0 10px" }}>Terms & Conditions</Link>
        </div>
      </footer>
    </>
  );
};

export default Footer;
