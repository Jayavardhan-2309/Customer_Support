import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

// GET /api/staff — list all staff
export async function GET(req: NextRequest) {
    const cookies = req.headers.get("cookie") ?? "";

    const djangoRes = await safeFetch(`${baseUrl}/api/v1/admin/staff/`, {
        method: "GET",
        headers: { "Cookie": cookies },
        credentials: "include",
    });

    const data = await djangoRes.json();
    if (!djangoRes.ok) return NextResponse.json(data, { status: djangoRes.status });
    return NextResponse.json(data);
}

// POST /api/admin/staff — add a new staff member
export async function POST(req: NextRequest) {
    const cookies = req.headers.get("cookie") ?? "";
    const body = await req.json();

    const djangoRes = await safeFetch(`${baseUrl}/api/v1/admin/staff/`, {
        method: "POST",
        headers: {
            "Cookie": cookies,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = await djangoRes.json();
    if (!djangoRes.ok) return NextResponse.json(data, { status: djangoRes.status });
    return NextResponse.json(data, { status: 201 });
}