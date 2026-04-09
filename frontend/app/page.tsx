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
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --bg: #07070c;
          --surface: #0f0f1a;
          --surface2: #141427;
          --border: rgba(255,255,255,0.08);
          --accent: #5b9cff;
          --accent2: #8b5cf6;
          --text: #f1f1f7;
          --muted: #7a7aa0;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: var(--bg); color: var(--text); }

        .page {
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          background: radial-gradient(circle at 50% -10%, rgba(91,156,255,0.12), transparent 40%), var(--bg);
        }

        /* NAV */
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          height: 64px;
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(10px);
          background: rgba(10,10,18,0.7);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .logo {
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .logo-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .nav-links button {
          margin-left: 0.6rem;
        }

        .btn {
          padding: 0.45rem 1.1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          transition: 0.2s;
        }

        .btn:hover {
          color: var(--text);
          border-color: rgba(255,255,255,0.2);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border: none;
          color: white;
        }

        /* HERO */
        .hero {
          text-align: center;
          padding: 6rem 1.5rem 4rem;
          opacity: 0;
          transform: translateY(20px);
          transition: 0.8s ease;
        }

        .hero.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          line-height: 1.1;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #fff, #9ca3af);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-title span {
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-sub {
          color: var(--muted);
          max-width: 500px;
          margin: 0 auto 2rem;
          line-height: 1.6;
        }

        .hero-cta {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .hero-cta button {
          padding: 0.8rem 1.8rem;
          border-radius: 8px;
        }

        /* GLASS CARDS */
        .section {
          padding: 4rem 1.5rem;
          max-width: 1100px;
          margin: auto;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.2rem;
        }

        .card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 2rem;
          backdrop-filter: blur(10px);
          transition: 0.25s;
        }

        .card:hover {
          background: var(--surface2);
          transform: translateY(-4px);
        }

        .card h4 {
          margin-bottom: 0.6rem;
        }

        .card p {
          color: var(--muted);
          font-size: 0.9rem;
        }

        /* CTA */
        .cta {
          margin: 4rem 1.5rem;
          padding: 3rem;
          border-radius: 16px;
          text-align: center;
          background: linear-gradient(135deg, rgba(91,156,255,0.1), rgba(139,92,246,0.1));
          border: 1px solid var(--border);
        }

        .cta h3 {
          font-size: 1.8rem;
          margin-bottom: 1rem;
        }

        .cta button {
          margin-top: 1rem;
          padding: 0.8rem 2rem;
        }

        /* FOOTER */
        .footer {
          text-align: center;
          padding: 2rem;
          border-top: 1px solid var(--border);
          color: var(--muted);
          font-size: 0.8rem;
        }

        @media (max-width: 600px) {
          .nav { padding: 0 1rem; }
          .cta { padding: 2rem; }
        }
      `}</style>

      <div className="page">

        {/* NAV */}
        <nav className="nav">
          <div className="logo">
            <div className="logo-icon">AI</div>
            Support System
          </div>

          <div className="nav-links">
            <button className="btn" onClick={() => router.push("/login")}>Login</button>
            <button className="btn btn-primary" onClick={() => router.push("/signup")}>Signup</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero" ref={heroRef}>
          <h1 className="hero-title">
            Smart support for <span>modern teams</span>
          </h1>
          <p className="hero-sub">
            Handle tickets, automate replies, and keep conversations flowing — all in one intelligent system.
          </p>

          <div className="hero-cta">
            <button className="btn-primary" onClick={() => router.push("/signup")}>Get Started</button>
            <button className="btn" onClick={() => router.push("/login")}>Login</button>
          </div>
        </section>

        {/* FEATURES (no static metrics) */}
        <section className="section">
          <div className="grid">
            <div className="card">
              <h4>AI Replies</h4>
              <p>Generate intelligent responses instantly using your backend AI pipeline.</p>
            </div>

            <div className="card">
              <h4>Real-time Tickets</h4>
              <p>Live updates powered by WebSockets ensure your UI is always fresh.</p>
            </div>

            <div className="card">
              <h4>Full History</h4>
              <p>Every interaction is stored and accessible with complete context.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="cta">
          <h3>Start building your support system</h3>
          <p>No static fluff. Just your real data.</p>
          <button className="btn-primary" onClick={() => router.push("/signup")}>
            Create Account
          </button>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          © {new Date().getFullYear()} AI Support System
        </footer>

      </div>
    </>
  )
}
