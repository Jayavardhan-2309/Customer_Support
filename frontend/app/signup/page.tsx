"use client";

import axios from "axios";
import { useEffect, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/logger";
import api from "@/src/lib/axios";
import { Organization } from "@/types/customTypes";
import { SignupForm } from "./SignupForm";

const ALLOWED_EMAIL_DOMAINS = new Set(["gmail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com"]);

const isAllowedEmail = (email: string): boolean => {
  if (/\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const domain = parts[1].toLowerCase();
  if (!domain.includes(".") || domain.endsWith(".") || domain.startsWith(".")) return false;
  return ALLOWED_EMAIL_DOMAINS.has(domain);
};

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.get("organizations/", { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setOrganizations(res.data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          logger.error("Failed to load organizations", err);
        }
      });
    return () => controller.abort();
  }, []);

  const handleSignup = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!isAllowedEmail(email)) {
      setError("Only Gmail, Outlook, Hotmail, Live, or Yahoo email addresses are allowed.");
      return;
    }

    setLoading(true);
    try {
      if (role === "admin") {
        await api.post("admin-signup/", { email, username, password, organization_name: organizationName });
      } else {
        await api.post("signup/", { email, username, password, organization: organizationId });
      }
      router.push("/login");
    } catch (err: unknown) {
      setLoading(false);
      if (axios.isAxiosError(err)) {
        logger.error(err.response?.data);
        setError(JSON.stringify(err.response?.data));
      } else {
        logger.error("something went wrong");
        setError("Something went wrong");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-white">Create Account</h1>
        <p className="text-center text-slate-400 mt-2">Sign up to get started</p>
        <form onSubmit={handleSignup}>
          <SignupForm
            email={email}
            error={error}
            loading={loading}
            organizationId={organizationId}
            organizationName={organizationName}
            organizations={organizations}
            password={password}
            role={role}
            setEmail={setEmail}
            setOrganizationId={setOrganizationId}
            setOrganizationName={setOrganizationName}
            setPassword={setPassword}
            setRole={setRole}
            setShowPassword={setShowPassword}
            setUsername={setUsername}
            showPassword={showPassword}
            username={username}
          />
        </form>
        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-slate-300 text-sm">
            Already have an account?{" "}
            <button type="button" onClick={() => router.push("/login")} className="text-indigo-400 hover:underline font-medium">
              Login
            </button>
          </p>
          <p className="text-slate-300 text-sm">
            <button type="button" onClick={() => router.push("/")} className="text-indigo-400 hover:underline">
              Back to Home
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
