import { NextRequest, NextResponse } from "next/server";
import api from "@/src/lib/axios";
const baseUrl= api.defaults.baseURL;

export async function GET(req: NextRequest) {
    const cookies = req.headers.get("cookie") ?? "";

    const djangoRes = await fetch(`${baseUrl}/api/v1/admin/pdfs/`, {
        method: "GET",
        headers: {
            "Cookie": cookies,
        },
        credentials: "include",
    });

    const data = await djangoRes.json();

    if (!djangoRes.ok) {
        return NextResponse.json(data, { status: djangoRes.status });
    }

    return NextResponse.json(data);
}
