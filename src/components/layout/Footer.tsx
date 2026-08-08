import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, Instagram, Linkedin } from "lucide-react";

export const WhatsAppIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12.031 21.992c-1.58-.005-3.136-.42-4.496-1.199l-5.111 1.341 1.366-4.981c-.854-1.423-1.306-3.056-1.306-4.733 0-5.234 4.262-9.497 9.5-9.497 2.536 0 4.921.988 6.713 2.782 1.791 1.791 2.778 4.175 2.778 6.711 0 5.234-4.262 9.497-9.5 9.497l.056-.121zm-4.431-2.923l.261-.155c1.282-.765 2.76-1.168 4.281-1.168 4.417 0 8.016-3.599 8.016-8.016 0-2.141-.834-4.152-2.348-5.666-1.514-1.513-3.525-2.348-5.667-2.348-4.417 0-8.016 3.599-8.016 8.016 0 1.554.416 3.064 1.205 4.375l.169.282-.876 3.195 3.275-.853-.301-.662z" />
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.274-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.06-1.579-.79-2.73-1.428-3.791-3.21-.173-.292.01-.448.156-.59.13-.128.301-.349.449-.523.149-.174.198-.3.298-.497.098-.198.05-.371-.025-.521-.075-.15-.672-1.62-.922-2.217-.24-.582-.485-.503-.672-.511-.173-.008-.372-.008-.57-.008s-.522.075-.795.372c-.273.296-1.045 1.02-1.045 2.485s1.07 2.879 1.218 3.076c.15.197 2.096 3.197 5.08 4.484 1.942.84 2.37.766 2.788.718.421-.05 1.767-.722 2.016-1.421.25-.698.25-1.296.175-1.421-.073-.126-.271-.202-.572-.351z" />
  </svg>
);

const Footer = () => {
  return (
    <>
      <style>
        {`
          .footer-custom {
            background-color: #0d47a1;
            color: white;
            padding: 36px 24px 20px;
            font-family: Arial, sans-serif;
          }

          .footer-container-custom {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 24px;
            margin-bottom: 24px;
          }

          .footer-title-custom {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
            color: white;
          }

          .footer-link-custom {
            margin-bottom: 8px;
            font-size: 14px;
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
            width: 110px;
            height: 110px;
            background: white;
            padding: 8px;
            border-radius: 10px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }

          .contact-item-custom {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
            font-size: 14px;
            color: #e0e8ff;
          }

          .contact-item-custom a {
            color: inherit;
            text-decoration: none;
          }

          .social-icons-custom {
            display: flex;
            gap: 12px;
            margin-top: 12px;
          }

          .social-icon-btn {
            width: 34px;
            height: 34px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.3s;
            color: white;
          }

          .social-icon-btn:hover {
            background: #ffeb3b;
            color: #0d47a1;
            transform: translateY(-3px);
          }

          .footer-bottom-custom {
            text-align: center;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 16px;
            font-size: 13px;
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
            <div className="footer-link-custom"><Link to="/contact?type=general" target="_blank" rel="noopener noreferrer">Contact us</Link></div>
            {/* <div className="footer-link-custom font-bold" style={{ marginTop: '15px' }}><Link to="/privacy-policy">Privacy Policy</Link></div>
            <div className="footer-link-custom font-bold"><Link to="/terms">Terms & Conditions</Link></div> */}
          </div>

          {/* Our Solutions */}
          <div>
            <h3 className="footer-title-custom">Our Solutions</h3>
            <p className="footer-link-custom" style={{ color: '#e0e8ff' }}>End-to-End Job Search Support</p>
            <p className="footer-link-custom" style={{ color: '#e0e8ff' }}>Recruiter-Led Profile Marketing</p>
            <p className="footer-link-custom" style={{ color: '#e0e8ff' }}>Resume Optimization</p>
            <p className="footer-link-custom" style={{ color: '#e0e8ff' }}>Interview & Screening Prep</p>
            <p className="footer-link-custom" style={{ color: '#e0e8ff' }}>Secure Data Handling</p>
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
              <a href="https://www.instagram.com/hyrind_usa?igsh=NzZhcjJ1cmFzbXdu" target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                <Instagram size={20} />
              </a>
              <a href="https://linkedin.com/company/hyrind" target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                <Linkedin size={20} />
              </a>
              <a href="https://Wa.me/+13143540634/" target="_blank" rel="noopener noreferrer" className="social-icon-btn">
                <WhatsAppIcon size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom-custom">
          © {new Date().getFullYear()} HYRIND. All Rights Reserved |
          <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#dce6ff", margin: "0 10px" }}>Privacy Policy</Link> |
          <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#dce6ff", margin: "0 10px" }}>Terms & Conditions</Link>
        </div>
      </footer>
    </>
  );
};

export default Footer;
