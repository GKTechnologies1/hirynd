import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/image.png";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => setOpen(!open);
  const closeMenu = () => setOpen(false);
  const toggleProfileDropdown = () => setProfileDropdownOpen(!profileDropdownOpen);
  const closeProfileDropdown = () => setProfileDropdownOpen(false);
  const toggleServicesDropdown = () => setServicesDropdownOpen(!servicesDropdownOpen);
  const closeServicesDropdown = () => setServicesDropdownOpen(false);
  const toggleLoginDropdown = () => setLoginDropdownOpen(!loginDropdownOpen);
  const closeLoginDropdown = () => setLoginDropdownOpen(false);

  const handleLogout = async () => {
    await signOut();
    closeProfileDropdown();
    navigate("/candidate-login");
  };

  const isActive = (path: string) => location.pathname === path;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (profileDropdownOpen && !target.closest('.profile-container')) {
        closeProfileDropdown();
      }
      if (servicesDropdownOpen && !target.closest('.services-container')) {
        closeServicesDropdown();
      }
      if (loginDropdownOpen && !target.closest('.login-container')) {
        closeLoginDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen, servicesDropdownOpen, loginDropdownOpen]);

  useEffect(() => {
    closeMenu();
    closeServicesDropdown();
    closeLoginDropdown();
  }, [location.pathname]);

  const userName = user?.profile?.full_name || user?.email?.split('@')[0] || "User";

  return (
    <>
      <style>{`
        .navbar-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.6);
          z-index: 40;
          transition: opacity 0.3s;
          backdrop-filter: blur(4px);
        }
        
        .navbar-overlay.visible {
          opacity: 1;
          visibility: visible;
        }
        
        .navbar-overlay.hidden {
          opacity: 0;
          visibility: hidden;
        }

        .navbar {
          width: 100%;
          background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%);
          color: white;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          box-shadow: 0 4px 20px rgba(13, 71, 161, 0.25);
          backdrop-filter: blur(10px);
        }

        .navbar-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 5%;
        }

        .navbar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 80px;
          transition: all 0.3s ease;
        }
        .navbar-logo {
          position: absolute;
          left: 2%;
        }
        .navbar-logo img {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          object-fit: contain;
          background: white;
          border: 3px solid rgba(255, 255, 255, 0.3);
          transition: transform 0.3s ease, border-color 0.3s ease;
        }

        .navbar-logo img:hover {
          transform: scale(1.1) rotate(5deg);
          border-color: rgba(255, 255, 255, 0.8);
        }

        .navbar-desktop {
          display: none;
          align-items: center;
          gap: 1.75rem;
          margin-left: auto;
        }

        @media (min-width: 1024px) {
          .navbar-desktop {
            display: flex;
            position: absolute;
            right: 2%;
          }
        }

        .nav-link {
          color: white;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          padding: 10px 18px;
          border-radius: 8px;
          transition: all 0.3s ease;
          position: relative;
          white-space: nowrap;
          cursor: pointer;
        }

        .nav-link::before {
          content: '';
          position: absolute;
          bottom: 0px;
          left: 50%;
          width: 0;
          height: 2px;
          background: white;
          transform: translateX(-50%);
          transition: width 0.3s ease;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
          color: white;
        }

        .nav-link:hover::before {
          width: 70%;
        }

        .nav-link.active {
          background: rgba(255, 255, 255, 0.25);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          color: white;
        }

        .register-btn {
          background: white;
          color: #0d47a1;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          white-space: nowrap;
        }

        .register-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
          background: #f0f7ff;
        }

        .profile-container, .services-container, .login-container {
          position: relative;
        }

        .profile-button, .services-button, .login-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          color: white;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .profile-button:hover, .services-button:hover, .login-button:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .profile-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0d47a1;
          font-size: 1.25rem;
          border: 2px solid rgba(255, 255, 255, 0.5);
        }

        .user-name {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown-arrow {
          width: 1rem;
          height: 1rem;
          transition: transform 0.2s;
        }

        .dropdown-arrow.rotate {
          transform: rotate(180deg);
        }

        .profile-dropdown, .services-dropdown, .login-dropdown {
          position: absolute;
          top: calc(100% + 15px);
          right: 0;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          min-width: 240px;
          overflow: hidden;
          z-index: 1001;
          border: 1px solid rgba(0, 71, 161, 0.1);
          animation: dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-header {
          padding: 12px 20px;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dropdown-item {
          width: calc(100% - 16px);
          margin: 4px 8px;
          text-align: left;
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dropdown-item:hover {
          background-color: #f1f5f9;
          color: #0d47a1;
          transform: translateX(4px);
        }

        .dropdown-item.logout {
          color: #dc2626;
          border-top: 1px solid #f1f5f9;
          margin-top: 8px;
          padding-top: 12px;
        }

        .dropdown-item.logout:hover {
          background-color: #fef2f2;
          color: #dc2626;
        }

        .mobile-menu-button {
          display: block;
          font-size: 1.5rem;
          padding: 8px;
          color: white;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        @media (min-width: 1024px) {
          .mobile-menu-button {
            display: none;
          }
        }

        .mobile-controls {
          position: absolute;
          right: 2%;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        @media (min-width: 1024px) {
          .mobile-controls {
            display: none;
          }
        }

        .mobile-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 300px;
          max-width: 85vw;
          background-color: white;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
          z-index: 1050;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          border-left: 4px solid #0d47a1;
        }

        .mobile-sidebar.open {
          transform: translateX(0);
        }

        .mobile-sidebar-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 80px 24px 24px;
        }

        .close-btn {
          font-size: 1.5rem;
          color: #0d47a1;
          background: rgba(13, 71, 161, 0.1);
          border: none;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
      `}</style>

      {/* overlay */}
      <div
        className={`navbar-overlay ${open ? "visible" : "hidden"}`}
        onClick={closeMenu}
      />

      {/* navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-content">
            {/* Logo */}
            <Link to="/" className="navbar-logo">
              <img src={logo} alt="Logo" />
            </Link>

            {/* Desktop Navigation */}
            <div className="navbar-desktop">
              <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
                Home
              </Link>
              <Link to="/about" className={`nav-link ${isActive("/about") ? "active" : ""}`}>
                About Us
              </Link>
              
              {/* Services Dropdown */}
              <div className="services-container">
                <button onClick={() => { toggleServicesDropdown(); navigate("/services") }} className="services-button">
                  <span className={isActive("/services") ? "nav-link active" : "nav-link"}>Services</span>
                  <svg
                    className={`dropdown-arrow ${servicesDropdownOpen ? "rotate" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {servicesDropdownOpen && (
                  <div className="services-dropdown" style={{ left: 0, right: 'auto' }}>
                    <div className="dropdown-header">
                      Our Services
                    </div>
                    <Link to="/services#profile-marketing" onClick={closeServicesDropdown} className="dropdown-item">
                      Profile Marketing
                    </Link>
                    <Link to="/services#interview-practice" onClick={closeServicesDropdown} className="dropdown-item">
                      Interview & Screening Call Practice
                    </Link>
                    <Link to="/services#skills-training" onClick={closeServicesDropdown} className="dropdown-item">
                      Skills Training
                    </Link>
                  </div>
                )}
              </div>

              <Link to="/how-it-works" className={`nav-link ${isActive("/how-it-works") ? "active" : ""}`}>
                How it works
              </Link>
              <Link to="/reviews" className={`nav-link ${isActive("/reviews") ? "active" : ""}`}>
                Reviews
              </Link>
              <Link to="/contact" className={`nav-link ${isActive("/contact") ? "active" : ""}`}>
                Contact Us
              </Link>

              {!user ? (
                <>
                <div className="login-container">
                  <button onClick={toggleLoginDropdown} className="register-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Login / Register</span>
                    <svg
                      className={`dropdown-arrow ${loginDropdownOpen ? "rotate" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {loginDropdownOpen && (
                    <div className="login-dropdown">
                      <div className="dropdown-header">
                        Portal Access
                      </div>
                      <Link to="/candidate-login" onClick={closeLoginDropdown} className="dropdown-item">
                        Candidate Login / Register
                      </Link>
                      <Link to="/recruiter-login" onClick={closeLoginDropdown} className="dropdown-item">
                        Recruiter Login / Register
                      </Link>
                      <Link to="/admin-login" onClick={closeLoginDropdown} className="dropdown-item">
                        Admin Portal
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="profile-container">
                  <button onClick={toggleProfileDropdown} className="profile-button">
                    <span className="profile-icon">👤</span>
                    <span className="user-name">{userName}</span>
                    <svg
                      className={`dropdown-arrow ${profileDropdownOpen ? "rotate" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {profileDropdownOpen && (
                    <div className="profile-dropdown">
                      <div className="dropdown-header">
                        {userName}
                      </div>
                      <button
                        onClick={() => {
                          closeProfileDropdown();
                          if (user.role === 'candidate') navigate('/candidate-dashboard');
                          else if (user.role === 'recruiter') navigate('/recruiter-dashboard');
                          else if (user.role === 'admin') navigate('/admin-dashboard');
                        }}
                        className="dropdown-item"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="dropdown-item logout"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Toggle */}
            <div className="mobile-controls">
               <button onClick={toggleMenu} className="mobile-menu-button">
                 {open ? "✕" : "☰"}
               </button>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar */}
        <div className={`mobile-sidebar ${open ? "open" : ""}`}>
          <div className="mobile-sidebar-content">
             <Link to="/" onClick={closeMenu} className="nav-link" style={{color: '#0d47a1', marginBottom: '10px'}}>Home</Link>
             <Link to="/about" onClick={closeMenu} className="nav-link" style={{color: '#0d47a1', marginBottom: '10px'}}>About Us</Link>
             <Link to="/services" onClick={closeMenu} className="nav-link" style={{color: '#0d47a1', marginBottom: '10px'}}>Services</Link>
             <Link to="/how-it-works" onClick={closeMenu} className="nav-link" style={{color: '#0d47a1', marginBottom: '10px'}}>How It Works</Link>
             <Link to="/reviews" onClick={closeMenu} className="nav-link" style={{color: '#0d47a1', marginBottom: '10px'}}>Reviews</Link>
             <Link to="/contact" onClick={closeMenu} className="nav-link" style={{color: '#0d47a1', marginBottom: '10px'}}>Contact Us</Link>
             
             {!user ? (
               <div style={{marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
                  <Link to="/candidate-login" onClick={closeMenu} className="nav-link" style={{color: '#0d47a1', marginBottom: '10px'}}>Candidate Login</Link>
                  <Link to="/recruiter-login" onClick={closeMenu} className="nav-link" style={{color: '#0d47a1', marginBottom: '10px'}}>Recruiter Login</Link>
               </div>
             ) : (
               <div style={{marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
                  <button onClick={handleLogout} className="nav-link" style={{color: '#dc2626', background: 'none', border: 'none', width: '100%', textAlign: 'left'}}>Logout</button>
               </div>
             )}
          </div>
        </div>
      </nav>
    </>
  );
}
