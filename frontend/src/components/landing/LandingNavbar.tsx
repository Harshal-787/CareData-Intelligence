import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BrandLogo } from "../common/BrandLogo";
import {
  LayoutDashboard,
  LogIn,
  Sparkles,
  Menu,
  X,
  FileCode2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

export const LandingNavbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Architecture", href: "#architecture" },
    { name: "Core Engine", href: "#features" },
    { name: "User Roles", href: "#roles" },
    { name: "Security & HIPAA", href: "#security" },
    { name: "Roadmap", href: "#roadmap" },
  ];

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={clsx(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#0b0f19]/90 backdrop-blur-xl border-b border-cyan-500/20 shadow-lg shadow-cyan-950/20 py-3"
          : "bg-transparent py-5",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="group flex items-center">
            <BrandLogo size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 rounded-full bg-slate-900/60 p-1 border border-slate-800 backdrop-blur-md">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-all"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href="http://localhost:8080/swagger"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 hover:bg-cyan-900/40 hover:border-cyan-500/40 transition"
              title="Open OpenAPI / Swagger Docs"
            >
              <FileCode2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Swagger API</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>

            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/25 transition group"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Enter Dashboard</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/25 transition group"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Get Started</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 rounded-2xl bg-slate-900/95 border border-slate-800 p-4 space-y-3 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => scrollToSection(e, link.href)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60"
                >
                  {link.name}
                </a>
              ))}
            </nav>
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <a
                href="http://localhost:8080/swagger"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/40 border border-cyan-500/20"
              >
                <span className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-cyan-400" />
                  Swagger API Docs
                </span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>

              {user ? (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-md"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Enter Dashboard</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700 text-center"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500 text-white text-xs font-semibold text-center"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Get Started</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
