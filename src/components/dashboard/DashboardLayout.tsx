import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, X, ChevronLeft, Phone, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";

interface NavItem {
  label: string;
  path: string;
  icon?: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  navItems: NavItem[];
  accentColor?: string;
}

const DashboardLayout = ({ children, title, navItems }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const userName = user?.profile?.full_name || user?.email?.split('@')[0] || "User";

  return (
    <>
      <Header />
      <div className="flex bg-neutral-50" style={{ minHeight: 'calc(100vh - 80px)', marginTop: '80px' }}>
        {/* Desktop Sidebar */}
        <aside
          className={`hidden flex-col border-r border-neutral-200 bg-[#0d47a1] text-white transition-all duration-300 ease-in-out lg:flex ${sidebarCollapsed ? "w-[68px]" : "w-64"
            }`}
        >
          <div className="flex h-16 items-center border-b border-white/10 px-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all ${sidebarCollapsed ? "mx-auto" : "ml-auto"
                }`}
            >
              <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>
          <nav className="flex-1 space-y-1 p-3 mt-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all duration-200 ${isActive
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                    } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
                >
                  <span className={`flex-shrink-0 ${isActive ? "text-white" : ""}`}>{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className={`border-t border-white/10 p-4 ${sidebarCollapsed ? "flex flex-col items-center" : ""}`}>
          <Link
            to="/contact?type=general"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all ${
              sidebarCollapsed ? "justify-center px-2" : ""
            }`}
          >
            <Phone className="h-4 w-4" />
            {!sidebarCollapsed && <span>Help Desk</span>}
          </Link>
        </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0d47a1] text-white shadow-2xl lg:hidden flex flex-col"
              >
                <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
                  <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center">
                      <span className="text-[#0d47a1] text-xs">H</span>
                    </div>
                    HYRIND
                  </Link>
                  <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white p-2 bg-white/10 rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-4 rounded-xl px-4 py-3 text-[14px] font-bold transition-all ${isActive
                            ? "bg-white/20 text-white shadow-lg"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
            </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Mobile Header Toggle */}
          <div className="lg:hidden flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="font-bold text-neutral-900 truncate">{title}</span>
            </div>
          </div>

          <main className="flex-1 overflow-auto p-4 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
