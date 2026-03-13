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
    api.get("organizations/").then(res => {
      setOrganizations(res.data);
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 text-black px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <h1 className="text-3xl font-bold text-center text-gray-800">
          Create Account
        </h1>
        <p className="text-center text-gray-500 mt-2">
          Sign up to get started
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-5">

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="you@something.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* USERNAME */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              placeholder="your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* ORGANIZATION (ONLY FOR ADMIN) */}
          {role === "admin" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                placeholder="Your company / bank name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {role === "user" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>

              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <p className="text-sm text-red-600 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-all"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6 text-sm">
          Already have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer hover:underline font-medium"
            onClick={() => router.push("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}