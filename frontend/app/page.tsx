"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export default function Home() {
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    el.classList.add("animate-in")
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #09090f;
          --surface:   #111120;
          --border:    rgba(255,255,255,0.08);
          --accent:    #4f8ef7;
          --accent2:   #7c3aed;
          --text:      #e8e8f0;
          --muted:     #7070a0;
          --grid:      rgba(79,142,247,0.04);
        }

        body { background: var(--bg); color: var(--text); }

        .page {
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          background:
            linear-gradient(180deg, #0e0e22 0%, #09090f 60%),
            repeating-linear-gradient(0deg,   transparent, transparent 39px, var(--grid) 40px),
            repeating-linear-gradient(90deg,  transparent, transparent 39px, var(--grid) 40px);
        }

        /* ── NAV ── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 3rem;
          height: 68px;
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(9,9,15,0.85);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          letter-spacing: 0.06em;
          color: var(--text);
          text-transform: uppercase;
        }

        .logo-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }

        .nav-links { display: flex; gap: 0.75rem; align-items: center; }

        .btn-ghost {
          padding: 0.45rem 1.1rem;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.04); }

        .btn-primary {
          padding: 0.45rem 1.25rem;
          border-radius: 6px;
          border: 1px solid rgba(79,142,247,0.5);
          background: linear-gradient(135deg, rgba(79,142,247,0.15), rgba(124,58,237,0.1));
          color: var(--accent);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, rgba(79,142,247,0.3), rgba(124,58,237,0.2));
          border-color: var(--accent);
          box-shadow: 0 0 20px rgba(79,142,247,0.2);
        }

        /* ── HERO ── */
        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 7rem 2rem 5rem;
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }

        .hero.animate-in { opacity: 1; transform: translateY(0); }

        .hero::before {
          content: '';
          position: absolute;
          inset: -40% -20%;
          background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(79,142,247,0.12), transparent 70%);
          pointer-events: none;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 1rem;
          border-radius: 999px;
          border: 1px solid rgba(79,142,247,0.25);
          background: rgba(79,142,247,0.08);
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: var(--accent);
          letter-spacing: 0.05em;
          margin-bottom: 2.5rem;
          text-transform: uppercase;
        }

        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px #4ade80;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(2.6rem, 6vw, 4.8rem);
          line-height: 1.1;
          max-width: 800px;
          margin-bottom: 1.5rem;
          background: linear-gradient(160deg, #e8e8f0 30%, #7070a0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-title em {
          font-style: italic;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          max-width: 480px;
          color: var(--muted);
          font-size: 1.05rem;
          line-height: 1.7;
          margin-bottom: 2.5rem;
          font-weight: 300;
        }

        .hero-cta {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-hero {
          padding: 0.8rem 2rem;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-hero-main {
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border: none;
          color: #fff;
          box-shadow: 0 4px 24px rgba(79,142,247,0.3);
        }
        .btn-hero-main:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(79,142,247,0.45); }

        .btn-hero-sec {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--muted);
        }
        .btn-hero-sec:hover { border-color: rgba(255,255,255,0.2); color: var(--text); background: rgba(255,255,255,0.03); }

        /* ── STATS ── */
        .stats-bar {
          display: flex;
          justify-content: center;
          gap: 0;
          flex-wrap: wrap;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          margin: 0 3rem;
        }

        .stat {
          flex: 1;
          min-width: 180px;
          padding: 2rem 2.5rem;
          border-right: 1px solid var(--border);
          text-align: center;
        }
        .stat:last-child { border-right: none; }

        .stat-num {
          font-family: 'DM Serif Display', serif;
          font-size: 2.4rem;
          color: var(--text);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.78rem;
          color: var(--muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
        }

        /* ── FEATURES ── */
        .features {
          padding: 6rem 3rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 1rem;
          text-align: center;
        }

        .section-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          text-align: center;
          color: var(--text);
          margin-bottom: 3.5rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .feature-card {
          padding: 2.5rem;
          background: var(--surface);
          transition: background 0.25s;
          position: relative;
          overflow: hidden;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,142,247,0.4), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .feature-card:hover { background: #16162a; }
        .feature-card:hover::before { opacity: 1; }

        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(79,142,247,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          margin-bottom: 1.25rem;
          transition: box-shadow 0.3s;
        }

        .feature-card:hover .feature-icon {
          box-shadow: 0 0 20px rgba(79,142,247,0.2);
        }

        .feature-name {
          font-weight: 500;
          font-size: 1rem;
          margin-bottom: 0.6rem;
          color: var(--text);
        }

        .feature-desc {
          color: var(--muted);
          font-size: 0.875rem;
          line-height: 1.65;
          font-weight: 300;
        }

        /* ── CTA STRIP ── */
        .cta-strip {
          margin: 0 3rem 6rem;
          padding: 3.5rem 4rem;
          border-radius: 12px;
          border: 1px solid rgba(79,142,247,0.2);
          background: linear-gradient(135deg, rgba(79,142,247,0.07), rgba(124,58,237,0.07));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
        }

        .cta-strip::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(79,142,247,0.15), rgba(124,58,237,0.15));
          z-index: -1;
        }

        .cta-text h3 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(1.4rem, 3vw, 2rem);
          margin-bottom: 0.5rem;
        }

        .cta-text p {
          color: var(--muted);
          font-size: 0.9rem;
          max-width: 400px;
          font-weight: 300;
        }

        /* ── FOOTER ── */
        .footer {
          border-top: 1px solid var(--border);
          padding: 2rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-copy {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: var(--muted);
          letter-spacing: 0.04em;
        }

        .footer-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: var(--muted);
          padding: 0.3rem 0.8rem;
          border: 1px solid var(--border);
          border-radius: 999px;
        }

        .footer-badge span { color: #4ade80; }
      `}</style>

      <div className="page">

        {/* Nav */}
        <nav className="nav">
          <div className="logo">
            <div className="logo-icon">AI</div>
            Support System
          </div>
          <div className="nav-links">
            <button className="btn-ghost" onClick={() => router.push("/login")}>Log in</button>
            <button className="btn-primary" onClick={() => router.push("/signup")}>Register</button>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero" ref={heroRef}>
          <div className="status-pill">
            <span className="status-dot" />
            All systems operational
          </div>

          <h2 className="hero-title">
            Customer support,<br /><em>intelligently</em> automated
          </h2>

          <p className="hero-sub">
            A modern support platform where customers get instant AI responses,
            and your team handles what truly matters.
          </p>

          <div className="hero-cta">
            <button className="btn-hero btn-hero-main" onClick={() => router.push("/signup")}>
              Get started free →
            </button>
            <button className="btn-hero btn-hero-sec" onClick={() => router.push("/login")}>
              Sign in
            </button>
          </div>
        </section>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat">
            <div className="stat-num">98%</div>
            <div className="stat-label">Resolution rate</div>
          </div>
          <div className="stat">
            <div className="stat-num">&lt;2s</div>
            <div className="stat-label">Avg. response time</div>
          </div>
          <div className="stat">
            <div className="stat-num">24/7</div>
            <div className="stat-label">AI availability</div>
          </div>
          <div className="stat">
            <div className="stat-num">10k+</div>
            <div className="stat-label">Tickets resolved</div>
          </div>
        </div>

        {/* Features */}
        <section className="features">
          <p className="section-label">What's inside</p>
          <h3 className="section-title">Everything your team needs</h3>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h4 className="feature-name">AI-Generated Responses</h4>
              <p className="feature-desc">
                Instantly generate helpful, context-aware replies to customer queries
                using state-of-the-art language models — no waiting, no delays.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🗂</div>
              <h4 className="feature-name">Ticket Management</h4>
              <p className="feature-desc">
                Staff can view, prioritize, and resolve support tickets from a
                clean, unified dashboard with full status tracking.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h4 className="feature-name">Conversation History</h4>
              <p className="feature-desc">
                Every interaction is logged. Track complete threads between AI,
                customers, and agents — full context, always.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Strip */}
        <div className="cta-strip">
          <div className="cta-text">
            <h3>Ready to transform your support?</h3>
            <p>Set up in minutes. No credit card required.</p>
          </div>
          <button className="btn-hero btn-hero-main" onClick={() => router.push("/signup")}>
            Create your account →
          </button>
        </div>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-copy">
            © {new Date().getFullYear()} AI Customer Support System
          </div>
          <div className="footer-badge">
            <span>●</span> Powered by AI
          </div>
        </footer>

      </div>
    </>
  )
}