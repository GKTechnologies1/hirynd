import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Home", path: "/" },
  { label: "About Us", path: "/about" },
  {
    label: "Services",
    children: [
      { label: "Profile Marketing", path: "/services/profile-marketing" },
      { label: "Interview & Screening Call Practice", path: "/services/interview-training" },
      { label: "Skills Training", path: "/services/skills-training" },
    ],
  },
  { label: "How It Works", path: "/how-it-works" },
  { label: "Reviews", path: "/reviews" },
  { label: "Contact Us", path: "/contact" },
];

const loginItems = [
  { label: "Candidate Login / Register", path: "/candidate-login" },
  { label: "Recruiter Login / Register", path: "/recruiter-login" },
];

const adminLoginItem = { label: "Admin Portal", path: "/admin-login" };

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight text-primary">
          HYRIND
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) =>
            item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
                  {item.label} <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {openDropdown === item.label && (
                  <div className="absolute left-0 top-full w-72 rounded-lg border border-border bg-card p-2 shadow-lg">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className="block rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path!}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "text-secondary"
                    : "text-foreground/80 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setOpenDropdown("login")}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <Button variant="hero" size="sm">
              Login / Register <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {openDropdown === "login" && (
              <div className="absolute right-0 top-full w-60 rounded-lg border border-border bg-card p-2 shadow-lg">
                {loginItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="block rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="my-1.5 border-t border-border" />
                <Link
                  to={adminLoginItem.path}
                  className="block rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  🔒 {adminLoginItem.label}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card lg:hidden">
          <nav className="container flex flex-col gap-1 py-4">
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label}>
                  <p className="px-3 py-2 text-sm font-semibold text-muted-foreground">{item.label}</p>
                  {item.children.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-6 py-2 text-sm text-foreground/80 hover:bg-muted"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path!}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
                >
                  {item.label}
                </Link>
              )
            )}
            <div className="mt-2 border-t border-border pt-2">
              {loginItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              <Link
                to={adminLoginItem.path}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
              >
                🔒 {adminLoginItem.label}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
