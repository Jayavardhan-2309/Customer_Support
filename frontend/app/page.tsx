"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { HomeStyles } from "./HomeStyles"

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
      <HomeStyles />

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
