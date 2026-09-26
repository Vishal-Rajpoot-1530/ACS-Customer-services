import React from 'react';
import { ImportPanel } from '../components/ImportPanel';
import { CyberBackgroundAnimation } from '../components/CyberBackgroundAnimation';

export const Home: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4.5rem-5rem)] bg-gradient-to-b from-blue-50/80 via-blue-100/40 to-slate-100 relative overflow-hidden py-4 sm:py-8">
      {/* Animated Cyber Cafe Background with Floating Icons & Holographic Grids */}
      <CyberBackgroundAnimation />

      {/* Main Centered Import Interface */}
      <div className="w-full max-w-4xl mx-auto px-4 z-10 relative">
        <ImportPanel />
      </div>
    </div>
  );
};

