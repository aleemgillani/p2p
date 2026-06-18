'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HowItWorksPage() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-md border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
            <span className="text-white font-bold text-xl">P2P Transfer</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link>
            <Link href="/how-it-works" className="text-white">How it Works</Link>
            <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-16 px-6">
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
            How It Works
          </h1>
          <p className="text-gray-400 text-lg">Simple, fast, and secure file transfer in 3 steps</p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {[
            { step: '01', icon: '📁', title: 'Select Your Files', desc: 'Open the dashboard and click Send Files. Select one or multiple files from your device. Any file type, any size is supported.', color: 'blue' },
            { step: '02', icon: '🔗', title: 'Get Transfer Link', desc: 'A unique secure link is generated instantly. Share this link with anyone you want to send files to — via WhatsApp, email, or any other way.', color: 'purple' },
            { step: '03', icon: '⚡', title: 'Direct Transfer', desc: 'The receiver opens the link and clicks Receive. Files transfer directly from your device to theirs — no server, no cloud, just pure P2P.', color: 'green' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex gap-6 items-start hover:border-blue-500/30 transition-all duration-300">
              <div className="text-5xl font-bold text-blue-600/30 min-w-16">{s.step}</div>
              <div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
                <p className="text-gray-400 text-lg leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Technology Behind It</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🌐', title: 'WebRTC', desc: 'Direct peer-to-peer connection between browsers — no server needed for data transfer.' },
              { icon: '🔒', title: 'End-to-End Encryption', desc: 'All data is encrypted before leaving your device. Only the receiver can decrypt it.' },
              { icon: '📡', title: 'TURN/STUN Servers', desc: 'Smart relay servers help establish connection even across different networks.' },
            ].map((t, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center hover:border-blue-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">{t.icon}</div>
                <h3 className="text-lg font-bold mb-2">{t.title}</h3>
                <p className="text-gray-400 text-sm">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Try?</h2>
        <p className="text-gray-400 mb-8">Start transferring files in seconds — completely free!</p>
        <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-lg">
          Get Started Free
        </Link>
      </section>

      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-white font-bold">P2P Transfer</span>
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