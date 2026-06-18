'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-md border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
            <span className="text-white font-bold text-xl">P2P Transfer</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link>
            <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">How it Works</Link>
            <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-blue-400 text-sm">No cloud. No limits. Just transfer.</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent leading-tight">
            Transfer Files<br />At Lightning Speed
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Send any file, any size, directly to anyone — without uploading to any server. 
            Pure peer-to-peer encryption.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-lg hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5">
              Start Transferring Free
            </Link>
            <Link href="/how-it-works" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-lg">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Why P2P Transfer?</h2>
          <p className="text-gray-400 text-center mb-16 text-lg">Built for speed, privacy, and simplicity</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🔒', title: 'End-to-End Encrypted', desc: 'Your files never touch our servers. Direct encrypted connection between devices.' },
              { icon: '⚡', title: 'Lightning Fast', desc: 'No upload/download delays. Transfer at your full network speed directly.' },
              { icon: '📦', title: 'No Size Limits', desc: 'Send files of any size — 1MB or 100GB, we handle it all seamlessly.' },
              { icon: '🌐', title: 'Works Everywhere', desc: 'Browser-based. No installation needed. Works on any device, any OS.' },
              { icon: '🆓', title: 'Always Free', desc: 'No hidden fees, no subscriptions. P2P Transfer is free forever.' },
              { icon: '📂', title: 'Multi-File Support', desc: 'Send multiple files at once. All delivered in a single transfer link.' },
            ].map((f, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-400 mb-16 text-lg">3 simple steps to transfer any file</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Select Files', desc: 'Choose files from your device. Any type, any size.' },
              { step: '02', title: 'Share Link', desc: 'Get a unique transfer link and share it with the receiver.' },
              { step: '03', title: 'Transfer!', desc: 'Receiver opens the link and files transfer directly to them.' },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-blue-600/20 mb-4">{s.step}</div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/register" className="inline-block mt-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-lg">
            Try It Now — Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs">⚡</span>
            </div>
            <span className="text-white font-bold">P2P Transfer</span>
          </div>
          <div className="flex gap-6 text-gray-400 text-sm">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <Link href="/how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          </div>
          <p className="text-gray-600 text-sm">© 2026 P2P Transfer by TechniKnest</p>
        </div>
      </footer>
    </div>
  );
}