import React from 'react';
import { AcsLogo } from '../components/AcsLogo';
import { Monitor, Printer, Wrench, Globe, Headphones, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  const servicePillars = [
    {
      title: 'Computer Support',
      desc: 'Hardware diagnostics, desktop troubleshooting & maintenance.',
      icon: Monitor
    },
    {
      title: 'Printer Support',
      desc: 'High-speed printing, document scanning, photocopying & laminating.',
      icon: Printer
    },
    {
      title: 'Software Help',
      desc: 'OS configuration, application setup, and digital form assistance.',
      icon: Wrench
    },
    {
      title: 'Internet Support',
      desc: 'High-speed internet browsing, online applications & portal services.',
      icon: Globe
    },
    {
      title: 'Customer Assistance',
      desc: 'Dedicated one-on-one technical guidance and digital concierge.',
      icon: Headphones
    }
  ];

  return (
    <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-blue-100 relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="shrink-0 flex justify-center">
            <AcsLogo size="hero" className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 drop-shadow-xl" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-orange-50 text-[#ff6600] text-xs font-bold tracking-wider uppercase border border-orange-200/60">
              About Our Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#04193d] tracking-tight">
              ACS <span className="text-[#0055ff]">Customer Service</span> <span className="text-[#ff6600]">Center</span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
              A modern digital service center designed to make computer-based, document, and online services simple, convenient, and accessible for everyone.
            </p>
            <div className="pt-1 flex items-center justify-center md:justify-start space-x-2 text-[#0055ff] font-bold text-sm italic">
              <span>“We Care, We Help, We Solve”</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Pillars from Brand Badge */}
      <div className="mb-8">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-[#0b1b3d] uppercase tracking-wider text-xs">
            Core Service Offerings
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {servicePillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-[#0052cc] hover:shadow-md transition-all group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052cc] group-hover:bg-[#0052cc] group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-xs text-[#0b1b3d] mb-1">
                  {pillar.title}
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action */}
      <div className="text-center">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#0055ff] to-[#ff6600] hover:from-[#0044cc] hover:to-[#ff5500] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <span>Return to File Import</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
