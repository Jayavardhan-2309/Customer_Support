import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const cookies = req.headers.get("cookie") ?? "";

    const formData = await req.formData();

    const djangoRes = await fetch("http://localhost:8000/api/v1/admin/pdfs/upload/", {
        method: "POST",
        headers: {
            "Cookie": cookies,
        },
        body: formData,
    });

    const data = await djangoRes.json();

    if (!djangoRes.ok) {
        return NextResponse.json(data, { status: djangoRes.status });
    }

    return NextResponse.json(data, { status: 201 });
}