"use client"

import { useEffect, useState } from "react"
import api from "@/src/lib/axios"
import { useRouter } from "next/navigation"

export default function FeedbackPage(){

  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const router = useRouter()

  useEffect(()=>{
    const load = async ()=>{
      const res = await api.get("/user/resolved-tickets/")
      setTickets(res.data)
    }
    load()
  }, [])

  const submitFeedback = async ()=>{
    await api.post(`/tickets/${selectedTicket.id}/feedback/`, {
      rating,
      comment
    })

    // remove ticket from UI
    setTickets(prev => prev.filter(t => t.id !== selectedTicket.id))
    setSelectedTicket(null)
  }

  if(tickets.length === 0){
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">No feedback available</h2>
        <p className="mt-2">
          Contact our admin at <span className="font-bold">admin@gmail.com</span>
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 text-black">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Give Feedback</h1>

                <button
                    onClick={() => router.push("/support")}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Dashboard
                </button>
            </div>

            <div className="grid gap-4">

                {tickets.map(ticket => (
                <div key={ticket.id} className="p-4 bg-white shadow rounded">

                    <h3 className="font-semibold text-lg">
                    {ticket.query}
                    </h3>

                    <p className="text-sm text-gray-600 mt-2">
                    Staff: {ticket.staff_name}
                    </p>

                    <p className="mt-3">
                    <span className="font-semibold">Resolution:</span> {ticket.resolution_note}
                    </p>

                    {!ticket.has_feedback && (
                    <button
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                        onClick={()=>setSelectedTicket(ticket)}
                    >
                        Give Feedback
                    </button>
                    )}

                </div>
                ))}

            </div>

        {/* POPUP */}
        {selectedTicket && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center text-black">

            <div className="bg-white p-6 rounded w-96">

                <h2 className="text-lg font-bold mb-4">
                Rate Support
                </h2>

                <select
                className="border p-2 w-full"
                value={rating}
                onChange={(e)=>setRating(Number(e.target.value))}
                >
                <option value={5}>⭐⭐⭐⭐⭐</option>
                <option value={4}>⭐⭐⭐⭐</option>
                <option value={3}>⭐⭐⭐</option>
                <option value={2}>⭐⭐</option>
                <option value={1}>⭐</option>
                </select>

                <textarea
                className="border p-2 w-full mt-3"
                placeholder="Write feedback..."
                onChange={(e)=>setComment(e.target.value)}
                />

                <div className="flex justify-end gap-2 mt-4">

                <button
                    onClick={()=>setSelectedTicket(null)}
                    className="px-3 py-1 bg-gray-300 rounded"
                >
                    Cancel
                </button>

                <button
                    onClick={submitFeedback}
                    className="px-3 py-1 bg-green-500 text-white rounded"
                >
                    Submit
                </button>

                </div>

            </div>
            </div>
        )}

    </div>
  )
}