import { NextRequest, NextResponse } from "next/server";
import api from "@/src/lib/axios";
const baseUrl= api.defaults.baseURL;

export async function POST(req: NextRequest) {
    const body = await req.json();

    // Get cookies from the incoming request to forward to Django
    // Django needs these to authenticate the user (access token)
    const cookies = req.headers.get("cookie") ?? "";

    const djangoRes = await fetch(`${baseUrl}/api/v1/support-ai/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Cookie": cookies,         // forward the httpOnly cookies so Django can auth the user
        },
        body: JSON.stringify({ prompt: body.message }),  // frontend sends "message", Django expects "prompt"
        credentials: "include",
    });

    const data = await djangoRes.json();

    if (!djangoRes.ok) {
        return NextResponse.json(
            { reply: "Something went wrong. Please try again." },
            { status: djangoRes.status }
        );
    }

    return NextResponse.json(data);
}