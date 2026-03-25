import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, User, Menu, X, ChevronLeft, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out lg:flex ${
          sidebarCollapsed ? "w-[68px]" : "w-64"
        }`}
      >
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          {!sidebarCollapsed && (
            <Link to="/" className="text-lg font-bold tracking-tight text-sidebar-primary">
              HYRIND
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${
              sidebarCollapsed ? "mx-auto" : "ml-auto"
            }`}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
              >
                <span className={`flex-shrink-0 ${isActive ? "text-sidebar-primary" : ""}`}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={`border-t border-sidebar-border p-3 ${sidebarCollapsed ? "flex flex-col items-center" : ""}`}>
          <div className="mb-2">
            <Link
              to="/help-desk"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all ${
                sidebarCollapsed ? "justify-center px-2" : ""
              }`}
            >
              <Phone className="h-4 w-4" />
              {!sidebarCollapsed && <span>Help Desk / Support</span>}
            </Link>
          </div>
          {!sidebarCollapsed && (
            <div className="mb-2 flex items-center gap-2.5 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-sidebar-foreground/80">{user?.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${
              sidebarCollapsed ? "w-8 h-8 p-0" : "w-full justify-start"
            }`}
            onClick={handleSignOut}
            title="Sign Out"
          >
            <LogOut className={`h-3.5 w-3.5 ${sidebarCollapsed ? "" : "mr-2"}`} />
            {!sidebarCollapsed && <span className="text-xs">Sign Out</span>}
          </Button>
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
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground shadow-xl lg:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
                <Link to="/" className="text-lg font-bold tracking-tight text-sidebar-primary">HYRIND</Link>
                <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground/60">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-0.5 p-3">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-sidebar-border p-3">
                <p className="truncate text-xs text-sidebar-foreground/60 mb-2 px-1">{user?.email}</p>
                <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/60" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Dashboard Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-[hsl(var(--dashboard-header))] px-4 lg:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--dashboard-header-foreground))]/70 hover:bg-white/10 transition-colors lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="lg:hidden text-base font-bold text-sidebar-primary">HYRIND</Link>
            <div className="hidden lg:block">
              <h1 className="text-sm font-semibold text-[hsl(var(--dashboard-header-foreground))]">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[hsl(var(--dashboard-header-foreground))]/70 hover:bg-white/10 hover:text-[hsl(var(--dashboard-header-foreground))]"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Title (below header, visible) */}
        <div className="border-b border-border bg-card px-4 py-3 lg:px-6">
          <h2 className="text-lg font-semibold text-card-foreground lg:hidden">{title}</h2>
          <h2 className="text-lg font-semibold text-card-foreground hidden lg:block">{title}</h2>
        </div>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
