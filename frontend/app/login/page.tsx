"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: any) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                setError("Invalid username or password");
                return;
            }

            const role = data?.user?.role;
            if (role === "admin") router.push("/admin");
            else if (role === "staff") router.push("/staff");
            else router.push("/support");
        } catch (err) {
            console.error(err);
            setError("Invalid username or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8 text-white">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 shadow rounded-lg p-6 sm:p-8">
                
                <h1 className="text-xl sm:text-2xl font-semibold mb-6 text-center text-white">
                    Login to get Support
                </h1>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="border border-slate-700 bg-slate-950 text-white rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 text-sm sm:text-base"
                        required
                    />

                    <div>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                            required
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 text-white py-2.5 rounded hover:bg-indigo-700 transition disabled:opacity-60 text-sm sm:text-base font-medium"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

                <div className="flex flex-col items-center gap-2 mt-6">
                    
                    <p className="text-slate-300 text-center text-sm">
                        Don't have an account?{" "}
                        <span
                            className="text-indigo-400 cursor-pointer hover:underline font-medium"
                            onClick={() => router.push("/signup")}
                        >
                            Signup
                        </span>
                    </p>

                    <p className="text-slate-300 text-center text-sm">
                        <span
                            className="text-indigo-400 cursor-pointer hover:underline"
                            onClick={() => router.push("/")}
                        >
                            ← Back to Home
                        </span>
                    </p>

                </div>

                {error && (
                    <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
                )}

                <p className="mt-6 text-xs sm:text-sm text-center text-slate-500">
                    Authorized users only
                </p>

            </div>
        </div>
    );
}