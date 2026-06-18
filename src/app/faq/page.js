'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function FAQPage() {
  const [visible, setVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const faqs = [
    { q: 'Is P2P Transfer really free?', a: 'Yes! P2P Transfer is completely free to use. No hidden fees, no subscriptions, no limits.' },
    { q: 'How large can the files be?', a: 'There is no file size limit. You can transfer files of any size — from a few KB to hundreds of GB.' },
    { q: 'Is my data safe?', a: 'Absolutely. Your files are transferred directly between devices using end-to-end encryption. No data is stored on our servers.' },
    { q: 'Does the receiver need an account?', a: 'No! The receiver just needs the transfer link. Only the sender needs an account.' },
    { q: 'What happens if the connection drops?', a: 'Our system supports resumable transfers. If the connection drops, the transfer can resume from where it stopped.' },
    { q: 'Can I send multiple files at once?', a: 'Yes! You can select multiple files and they will all be sent through a single transfer link.' },
    { q: 'Does it work on mobile?', a: 'Yes! P2P Transfer works on any device with a modern browser — phone, tablet, or desktop.' },
    { q: 'How long is the transfer link valid?', a: 'The transfer link is valid as long as the sender keeps the browser window open. Once closed, the link expires.' },
  ];

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
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link>
            <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">How it Works</Link>
            <Link href="/faq" className="text-white">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400 text-lg">Everything you need to know about P2P Transfer</p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
              >
                <span className="font-semibold text-white">{faq.q}</span>
                <span className={`text-blue-400 text-xl transition-transform duration-300 ${openIndex === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-gray-400 leading-relaxed border-t border-gray-800 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
        <p className="text-gray-400 mb-8">Try it yourself — it's free!</p>
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