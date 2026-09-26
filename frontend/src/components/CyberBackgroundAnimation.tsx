import React, { useEffect, useRef } from 'react';
import { 
  Printer, 
  Monitor, 
  Scan, 
  Wifi, 
  QrCode, 
  Copy, 
  Layers, 
  Globe, 
  Camera, 
  FileCheck, 
  ShieldCheck, 
  CreditCard 
} from 'lucide-react';

export const CyberBackgroundAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Constellation Mesh / Particle Network (Lightweight Canvas for all devices)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 800);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 800;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes configuration (Dynamic for all screen sizes)
    const particleCount = width < 640 ? 14 : width < 1024 ? 22 : 32;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }> = [];

    const colors = [
      'rgba(0, 85, 255, 0.45)',    // Electric Royal Blue
      'rgba(255, 102, 0, 0.45)',   // Radiant Fiery Orange
      'rgba(0, 180, 216, 0.4)',    // Cyan
      'rgba(255, 170, 0, 0.35)'    // Amber Gold
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.8 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const maxDistance = width < 640 ? 95 : width < 1024 ? 120 : 150;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw constellation connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 82, 204, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw particle dots
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. Full 12 Curated Service Badges for Desktop & Laptop (lg & xl)
  const desktopElements = [
    // Left Side
    { icon: Printer, label: 'Laser & Color Print', desc: 'Instant High-DPI Output', top: '8%', left: '2.5%', delay: '0s', duration: '7.8s', rotate: '-2deg' },
    { icon: Scan, label: 'Document Scanner', desc: 'Multi-Page PDF & OCR', top: '26%', left: '4%', delay: '1.4s', duration: '8.6s', rotate: '3deg' },
    { icon: FileCheck, label: 'Aadhaar / PAN Desk', desc: 'Govt Identity Verification', top: '46%', left: '2%', delay: '2.8s', duration: '8.2s', rotate: '-3deg' },
    { icon: Wifi, label: 'Dedicated Cyber Net', desc: 'Gigabit Fiber Uplink', top: '66%', left: '4%', delay: '1s', duration: '9.2s', rotate: '2.5deg' },
    { icon: Camera, label: 'Passport Photo Lab', desc: 'Instant Print & Sizing', top: '84%', left: '2.5%', delay: '3.4s', duration: '8.4s', rotate: '-2deg' },

    // Right Side
    { icon: Copy, label: 'Heavy-Duty Xerox', desc: 'Duplex & Bulk Copies', top: '8%', right: '2.5%', delay: '0.7s', duration: '8s', rotate: '2deg' },
    { icon: Globe, label: 'Online Exam / Vacancy', desc: 'Form Fill & Challan Pay', top: '26%', right: '4%', delay: '2.3s', duration: '8.8s', rotate: '-3deg' },
    { icon: QrCode, label: 'Fast UPI Payment', desc: 'Zero Fee Instant Pay', top: '46%', right: '2%', delay: '1.6s', duration: '8.3s', rotate: '3deg' },
    { icon: CreditCard, label: 'Debit / Micro-ATM', desc: 'Cash Withdrawal & POS', top: '66%', right: '4%', delay: '3.6s', duration: '8.9s', rotate: '-2.5deg' },
    { icon: ShieldCheck, label: 'Auto Privacy Wipe', desc: 'Encrypted & Auto Cleared', top: '84%', right: '2.5%', delay: '2s', duration: '7.7s', rotate: '2deg' },

    // Top Crest Badges
    { icon: Layers, label: 'Lamination & Spiral', desc: 'Waterproof Shield', top: '2.5%', left: '26%', delay: '2.4s', duration: '9.6s', rotate: '1.5deg' },
    { icon: Monitor, label: 'PC Station / Typing', desc: 'English & Hindi Fonts', top: '2.5%', right: '26%', delay: '3.8s', duration: '10s', rotate: '-1.5deg' }
  ];

  // 3. Tablet & Medium Screen Badges (sm to lg: 640px - 1024px)
  const tabletElements = [
    { icon: Printer, label: 'Color Print', top: '6%', left: '3%', delay: '0s', duration: '8s' },
    { icon: Copy, label: 'Fast Xerox', top: '6%', right: '3%', delay: '0.8s', duration: '7.6s' },
    { icon: Scan, label: 'Document Scan', top: '34%', left: '2%', delay: '1.5s', duration: '8.5s' },
    { icon: Globe, label: 'Online Forms', top: '34%', right: '2%', delay: '2.2s', duration: '8.8s' },
    { icon: QrCode, label: 'Instant UPI', top: '62%', left: '2%', delay: '1.2s', duration: '8.2s' },
    { icon: Camera, label: 'Photo Lab', top: '62%', right: '2%', delay: '2.9s', duration: '8.4s' },
    { icon: Wifi, label: 'Cyber Station', top: '88%', left: '4%', delay: '1.8s', duration: '9s' },
    { icon: FileCheck, label: 'ID Cards Desk', top: '88%', right: '4%', delay: '3.2s', duration: '8.6s' }
  ];

  // 4. Mobile Screen Badges (< 640px: Phones)
  const mobileElements = [
    { icon: Printer, label: 'Print', top: '3%', left: '3%', delay: '0s', duration: '7s' },
    { icon: Copy, label: 'Xerox', top: '3%', right: '3%', delay: '0.9s', duration: '7.5s' },
    { icon: Scan, label: 'Scan', top: '22%', left: '2%', delay: '1.6s', duration: '8.2s' },
    { icon: Globe, label: 'Forms', top: '22%', right: '2%', delay: '2.4s', duration: '8.5s' },
    { icon: QrCode, label: 'UPI Pay', top: '74%', left: '2%', delay: '1.2s', duration: '7.8s' },
    { icon: Camera, label: 'Photo Lab', top: '74%', right: '2%', delay: '2.8s', duration: '8s' },
    { icon: Wifi, label: 'Internet', top: '91%', left: '4%', delay: '1.8s', duration: '8.8s' },
    { icon: ShieldCheck, label: 'Secure', top: '91%', right: '4%', delay: '3s', duration: '8.4s' }
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Ambient Mesh Gradient + Aurora Glow */}
      <div className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[950px] h-[600px] bg-gradient-to-b from-blue-600/16 via-indigo-600/10 to-transparent rounded-full blur-[100px] animate-aurora-spin" />
      <div className="absolute top-[18%] -left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/14 via-blue-600/10 to-transparent rounded-full blur-[110px] animate-aurora-1" />
      <div className="absolute top-[18%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-tl from-blue-600/15 via-indigo-400/10 to-transparent rounded-full blur-[110px] animate-aurora-2" />
      <div className="absolute -bottom-[12%] left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-gradient-to-t from-blue-500/12 via-cyan-400/8 to-transparent rounded-full blur-[90px]" />

      {/* 2. Cyber Circuit Grid with Blueprint Lines */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0052cc 1px, transparent 1px),
            linear-gradient(to bottom, #0052cc 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px'
        }}
      />

      {/* 3. Constellation Mesh Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-80" 
      />

      {/* 4. Radial Optical Mask */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(248,250,255,0.3)_0%,rgba(240,246,255,0.65)_48%,rgba(229,239,255,0.92)_100%)]" />

      {/* 5A. DESKTOP/LAPTOP BADGES (lg and xl screens >= 1024px) */}
      <div className="hidden lg:block">
        {desktopElements.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={`desktop-${idx}`}
              className="absolute flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/75 shadow-[0_6px_22px_rgba(0,82,204,0.06)] opacity-70 hover:opacity-100 hover:bg-white/85 hover:shadow-[0_10px_30px_rgba(0,82,204,0.12)] transition-all duration-300 animate-cyber-float group"
              style={{
                top: item.top,
                left: item.left,
                right: item.right,
                animationDelay: item.delay,
                animationDuration: item.duration,
                transform: `rotate(${item.rotate})`
              }}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0052cc]/75 to-[#0066fe]/75 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:from-[#0052cc] group-hover:to-[#0066fe] group-hover:scale-105 transition-all">
                <Icon size={16} strokeWidth={2.2} className="text-white/95 group-hover:text-white" />
              </div>
              <div className="flex flex-col pr-1 text-left">
                <span className="text-[11.5px] font-bold text-[#0b1b3d]/85 group-hover:text-[#0b1b3d] tracking-tight leading-tight whitespace-nowrap transition-colors">
                  {item.label}
                </span>
                <span className="text-[9px] font-medium text-slate-400 group-hover:text-slate-500 tracking-tight leading-tight whitespace-nowrap mt-0.5 transition-colors">
                  {item.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5B. TABLET / MEDIUM SCREENS (sm to lg: 640px to 1023px) */}
      <div className="hidden sm:block lg:hidden">
        {tabletElements.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={`tablet-${idx}`}
              className="absolute flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-white/65 backdrop-blur-md border border-white/80 shadow-[0_4px_16px_rgba(0,82,204,0.06)] opacity-75 hover:opacity-100 transition-all duration-300 animate-cyber-float"
              style={{
                top: item.top,
                left: item.left,
                right: item.right,
                animationDelay: item.delay,
                animationDuration: item.duration
              }}
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#0052cc]/80 to-[#0066fe]/80 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Icon size={13} strokeWidth={2.2} className="text-white" />
              </div>
              <span className="text-[10.5px] font-bold text-[#0b1b3d]/85 whitespace-nowrap">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 5C. MOBILE PHONES (< 640px: iPhone, Android, etc.) */}
      <div className="block sm:hidden">
        {mobileElements.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={`mobile-${idx}`}
              className="absolute flex items-center space-x-1.5 px-2 py-1 rounded-xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_3px_12px_rgba(0,82,204,0.06)] opacity-80 animate-cyber-float"
              style={{
                top: item.top,
                left: item.left,
                right: item.right,
                animationDelay: item.delay,
                animationDuration: item.duration
              }}
            >
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#0052cc]/85 to-[#0066fe]/85 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Icon size={11} strokeWidth={2.2} className="text-white" />
              </div>
              <span className="text-[9.5px] font-bold text-[#0b1b3d]/90 whitespace-nowrap">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
