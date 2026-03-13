"use client"

import { useRouter } from "next/navigation"

export default function Home() {

  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* Navbar */}
      <nav className="flex justify-between items-center px-10 py-5 border-b bg-white">
        <h1 className="text-xl font-bold">AI Support System</h1>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 rounded-md border hover:bg-gray-100 cursor-pointer"
          >
            Login
          </button>

          <button
            onClick={() => router.push("/signup")}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center px-6 py-24">

        <h2 className="text-4xl font-bold mb-6 max-w-3xl">
          AI-Powered Customer Support System
        </h2>

        <p className="text-gray-600 max-w-xl mb-8">
          A modern support platform where customers can submit tickets and receive
          instant AI-generated responses while staff manage and resolve issues efficiently.
        </p>

        <button
          onClick={() => router.push("/signup")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Get Started
        </button>

      </section>

      {/* Features */}
      <section className="px-10 py-16 bg-white">

        <h3 className="text-2xl font-semibold text-center mb-12">
          Key Features
        </h3>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">

          <div className="p-6 border rounded-lg shadow-sm">
            <h4 className="font-semibold mb-2">AI Generated Responses</h4>
            <p className="text-gray-600 text-sm">
              Automatically generate helpful responses for customer queries using AI.
            </p>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h4 className="font-semibold mb-2">Ticket Management</h4>
            <p className="text-gray-600 text-sm">
              Staff can manage, prioritize and resolve support tickets efficiently.
            </p>
          </div>

          <div className="p-6 border rounded-lg shadow-sm">
            <h4 className="font-semibold mb-2">Conversation History</h4>
            <p className="text-gray-600 text-sm">
              Track complete conversation history between AI, customers, and support staff.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500 border-t">
        © {new Date().getFullYear()} AI Customer Support System
      </footer>

    </div>
  )
}