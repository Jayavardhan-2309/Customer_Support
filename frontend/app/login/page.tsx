"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/src/lib/axios";

export default function LoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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

            // Login returns the user's role — use it to redirect to the right page
            const role = data?.user?.role;

            if (role === "admin") {
                router.push("/admin");       // admin goes to context management page
            } else if(role==="staff"){
                router.push("/staff");
            }
            else {
                router.push("/support");     // regular user goes to support chat
            }
        } catch (err) {
            console.error(err);
            setError("Invalid username or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center text-black">
            <div className="w-full max-w-md bg-white shadow rounded-lg p-8">
                <h1 className="text-2xl font-semibold mb-6 text-center">
                    Login to get Support
                </h1>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white py-2 rounded hover:bg-gray-800 transition disabled:opacity-60"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>
                
                <div className="flex flex-col">
                    <p className="text-black text-center mt-6">
                        Don't have an account?{" "}
                        <span
                            className="text-blue-600 cursor-pointer hover:underline"
                            onClick={() => router.push("/signup")}
                        >
                            Signup
                        </span>
                    </p>

                    <p className="text-black text-center mt-2">
                        Home?{" "}
                        <span
                            className="text-blue-600 cursor-pointer hover:underline"
                            onClick={() => router.push("/")}
                        >
                            Home
                        </span>
                    </p>
                </div>

                {error && (
                    <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
                )}

                <p className="mt-6 text-sm text-center text-gray-600">
                    Authorized users only
                </p>
            </div>
        </div>
    );
}
