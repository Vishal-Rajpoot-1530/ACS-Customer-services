import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AcsLogo } from './AcsLogo';
import {
  Monitor,
  Printer,
  Wrench,
  Globe,
  Headphones,
  ShieldCheck,
  FileText,
  Clock,
  Send,
  MessageCircle,
  CheckCircle
} from 'lucide-react';

import { contactApi } from '../api/contact.api';

export const Footer: React.FC = () => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const WHATSAPP_NUMBER = '918953327220';

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };

  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !email.trim() || !message.trim()) {
      setSubmitError('Please complete all contact fields before sending.');
      return;
    }
    setSubmitError(null);

    try {
      await contactApi.createInquiry({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        message: message.trim(),
      });
    } catch (err) {
      console.warn('Backend inquiry submission failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Unable to send your inquiry right now.');
      return;
    }

    let formattedText = `*ACS Customer Service Centre Inquiry*%0A%0A`;
    if (name.trim()) formattedText += `*Name:* ${encodeURIComponent(name.trim())}%0A`;
    if (mobile.trim()) formattedText += `*Mobile:* ${encodeURIComponent(mobile.trim())}%0A`;
    if (email.trim()) formattedText += `*Email:* ${encodeURIComponent(email.trim())}%0A`;
    formattedText += `*Message:* ${encodeURIComponent(message.trim())}`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${formattedText}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setIsSent(true);
    setTimeout(() => {
      setMessage('');
      setName('');
      setMobile('');
      setEmail('');
      setIsSent(false);
    }, 3000);
  };

  return (
    <footer id="footer-section" className="w-full bg-[#030e24] text-slate-300 border-t border-slate-800/90 pt-12 pb-6 px-4 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        {/* Top 4-Column Structured Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">

          {/* Column 1: Brand & Motto */}
          <div className="space-y-4">
            <Link
              to="/"
              onClick={handleLogoClick}
              className="inline-flex items-center space-x-3.5 group cursor-pointer transition-transform duration-200 hover:opacity-95 outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none select-none"
              aria-label="Return to ACS Customer Service Center Homepage"
            >
              <AcsLogo size={62} className="shrink-0 drop-shadow-md group-hover:scale-105 transition-transform duration-200" />
              <div>
                <h3 className="font-extrabold text-base tracking-wide text-white group-hover:text-blue-300 transition-colors">
                  ACS Customer Service
                </h3>
                <span className="text-[11px] uppercase tracking-widest font-bold text-[#ff7700] block group-hover:text-[#ff9900] transition-colors">
                  Center
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed">
              Your one-stop digital kiosk and customer support center for fast file printing, cyber assistance, and online government/document services.
            </p>

            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-950/80 border border-orange-500/30 text-blue-200 text-xs font-semibold">
              <span className="italic">“We Care, We Help, We Solve”</span>
            </div>
          </div>

          {/* Column 2: Service Divisions (Display Only) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#0077ff] inline-block" />
              <span>Our Services</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center space-x-2 cursor-default hover:text-slate-300 transition-colors">
                <Printer className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
                <span>Document Printing & Scanning</span>
              </li>
              <li className="flex items-center space-x-2 cursor-default hover:text-slate-300 transition-colors">
                <Monitor className="w-3.5 h-3.5 text-[#ff7700] shrink-0" />
                <span>Computer & Cyber Cafe Access</span>
              </li>
              <li className="flex items-center space-x-2 cursor-default hover:text-slate-300 transition-colors">
                <FileText className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
                <span>Online Forms & Applications</span>
              </li>
              <li className="flex items-center space-x-2 cursor-default hover:text-slate-300 transition-colors">
                <Globe className="w-3.5 h-3.5 text-[#ff7700] shrink-0" />
                <span>Internet & Utility Services</span>
              </li>
              <li className="flex items-center space-x-2 cursor-default hover:text-slate-300 transition-colors">
                <Wrench className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
                <span>Technical & Software Help</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Direct WhatsApp Connect Form */}
          <div className="space-y-3 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Connect on WhatsApp</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Send direct inquiries, service requests, or file queries instantly.
            </p>

            <form onSubmit={handleWhatsAppSubmit} className="space-y-2 pt-1">
              <input
                type="text"
                required
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800/90 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="tel"
                  required
                  placeholder="Mobile Number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/90 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
                />

                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/90 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <textarea
                required
                placeholder="Type your message or inquiry..."
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800/90 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500 resize-none"
              />
              {submitError && <p className="text-[11px] font-semibold text-red-400" role="alert">{submitError}</p>}

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {isSent ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Opening WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Chat on WhatsApp</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Column 4: Centre Help & Operating Hours (Display Only) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Help & Working Hours</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start space-x-2">
                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-300 font-semibold block">Mon - Sat: 9:00 AM - 8:00 PM</span>
                  <span className="text-[11px] text-slate-500">Sunday: 10:00 AM - 4:00 PM</span>
                </div>
              </li>
              <li className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-medium">100% Encrypted File Processing</span>
              </li>
              <li className="flex items-center space-x-2">
                <Headphones className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>On-Desk Customer Assistance Available</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip: Display-only Tags & Copyright */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <span className="cursor-default hover:text-slate-400 transition-colors">Privacy Policy</span>
            <span>•</span>
            <span className="cursor-default hover:text-slate-400 transition-colors">Terms of Service</span>
            <span>•</span>
            <span className="cursor-default hover:text-slate-400 transition-colors">Cyber Cafe Policies</span>
            <span>•</span>
            <span className="cursor-default hover:text-slate-400 transition-colors">File Upload Safety</span>
          </div>

          <div className="text-center md:text-right font-medium text-slate-400">
            © 2026 ACS Customer Service Centre. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

