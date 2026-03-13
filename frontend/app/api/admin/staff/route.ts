import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/staff — list all staff
export async function GET(req: NextRequest) {
    const cookies = req.headers.get("cookie") ?? "";

    const djangoRes = await fetch("http://localhost:8000/api/v1/admin/staff/", {
        method: "GET",
        headers: { "Cookie": cookies },
    });

    const data = await djangoRes.json();
    if (!djangoRes.ok) return NextResponse.json(data, { status: djangoRes.status });
    return NextResponse.json(data);
}

// POST /api/admin/staff — add a new staff member
export async function POST(req: NextRequest) {
    const cookies = req.headers.get("cookie") ?? "";
    const body = await req.json();

    const djangoRes = await fetch("http://localhost:8000/api/v1/admin/staff/", {
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