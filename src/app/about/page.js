'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function AboutPage() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-md border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
            <span className="text-white font-bold text-xl">P2P Transfer</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/about" className="text-white">About</Link>
            <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">How it Works</Link>
            <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
            About P2P Transfer
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            We believe file sharing should be fast, private, and free — without compromising your data.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-4">
              P2P Transfer was built to solve a simple problem — why should your files go through a third-party server just to reach someone?
            </p>
            <p className="text-gray-400 text-lg leading-relaxed">
              Using WebRTC technology, we enable direct device-to-device transfers. Your files travel directly from you to the receiver — encrypted, fast, and private.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="space-y-4">
              {[
                { label: 'Files Transferred', value: '100% Private' },
                { label: 'Server Storage', value: 'Zero' },
                { label: 'File Size Limit', value: 'None' },
                { label: 'Cost', value: 'Free Forever' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-800 pb-4">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-blue-400 font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Built by TechniKnest</h2>
          <p className="text-gray-400 text-lg mb-12">
            A passionate team dedicated to building innovative tech solutions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🚀', title: 'Innovation First', desc: 'We build solutions that push boundaries.' },
              { icon: '🔐', title: 'Privacy Focused', desc: 'Your data belongs to you, always.' },
              { icon: '💡', title: 'Open & Transparent', desc: 'Simple, honest technology for everyone.' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Transfer?</h2>
        <p className="text-gray-400 mb-8">Join thousands of users who trust P2P Transfer.</p>
        <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-lg">
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
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