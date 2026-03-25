import { NextRequest, NextResponse } from "next/server";
import api from "@/src/lib/axios";
const baseUrl= api.defaults.baseURL;

export async function POST(req: NextRequest) {
    const cookies = req.headers.get("cookie") ?? "";

    const formData = await req.formData();

    const djangoRes = await fetch(`${baseUrl}/api/v1/admin/pdfs/upload/`, {
        method: "POST",
        headers: {
            "Cookie": cookies,
        },
        body: formData,
        credentials: "include",
    });

    const data = await djangoRes.json();

    if (!djangoRes.ok) {
        return NextResponse.json(data, { status: djangoRes.status });
    }

    return NextResponse.json(data, { status: 201 });
}