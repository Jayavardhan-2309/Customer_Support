"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/src/lib/axios";

/* ALLOWED EMAIL DOMAINS */
const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
];

/* EMAIL VALIDATION FUNCTION */
const isAllowedEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
};

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoadiing] = useState(false);

  const [role, setRole] = useState<"user" | "admin">("user");

  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState("");

  useEffect(() => {
    api.get("organizations/")
      .then(res => {
        console.log("SUCCESS:", res.data);
        setOrganizations(res.data);
      })
      .catch(err => {
        console.error("FULL ERROR:", err);

        if (err.response) {
          console.error("STATUS:", err.response.status);
          console.error("DATA:", err.response.data);
          console.error("HEADERS:", err.response.headers);
        } else if (err.request) {
          console.error("NO RESPONSE RECEIVED:", err.request);
        } else {
          console.error("REQUEST SETUP ERROR:", err.message);
        }
      });
  }, []);

  const handleSignup = async (e: any) => {
    e.preventDefault();
    setError("");

    if (!isAllowedEmail(email)) {
      setError(
        "Only Gmail, Outlook, Hotmail, Live, or Yahoo email addresses are allowed."
      );
      return;
    }

    setLoadiing(true);

    try {
      if (role === "admin") {
        await api.post("admin-signup/", {
          email,
          username,
          password,
          organization_name: organizationName,
        });
      } else {
        await api.post("signup/", {
          email,
          username,
          password,
          organization: organizationId
        });
      }

      router.push("/login");

    } catch (err: any) {
      setLoadiing(false);
      console.log(err.response?.data);
      setError(JSON.stringify(err.response?.data));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">

        <h1 className="text-3xl font-bold text-center text-white">
          Create Account
        </h1>
        <p className="text-center text-slate-400 mt-2">
          Sign up to get started
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-5">

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="you@something.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* USERNAME */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Username
            </label>
            <input
              placeholder="your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* ORGANIZATION (ADMIN) */}
          {role === "admin" && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Organization Name
              </label>
              <input
                placeholder="Your company / bank name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* ORGANIZATION (USER) */}
          {role === "user" && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Organization
              </label>

              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select organization</option>

                {organizations.map((org: any) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-all"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-slate-300 text-sm">
            Already have an account?{" "}
            <span
              className="text-indigo-400 cursor-pointer hover:underline font-medium"
              onClick={() => router.push("/login")}
            >
              Login
            </span>
          </p>

          {/* ✅ Back to Home added (same as login) */}
          <p className="text-slate-300 text-sm">
            <span
              className="text-indigo-400 cursor-pointer hover:underline"
              onClick={() => router.push("/")}
            >
              ← Back to Home
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}