import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const cookies = req.headers.get("cookie") ?? "";

    const djangoRes = await fetch("http://localhost:8000/api/v1/admin/pdfs/", {
        method: "GET",
        headers: {
            "Cookie": cookies,
        },
    });

    const data = await djangoRes.json();

    if (!djangoRes.ok) {
        return NextResponse.json(data, { status: djangoRes.status });
    }

    return NextResponse.json(data);
}
