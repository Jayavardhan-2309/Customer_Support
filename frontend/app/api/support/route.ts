import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function POST(req: NextRequest) {
    let body: { message?: string };
    try {
        body = (await req.json()) as { message?: string };
    } catch {
        return NextResponse.json({ reply: "Invalid request body." }, { status: 400 });
    }

    if (!body.message?.trim()) {
        return NextResponse.json({ reply: "Message is required." }, { status: 400 });
    }

    // Get cookies from the incoming request to forward to Django
    // Django needs these to authenticate the user (access token)
    const cookies = req.headers.get("cookie") ?? "";

    const djangoRes = await safeFetch(`${baseUrl}/api/v1/support-ai/`, {
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
