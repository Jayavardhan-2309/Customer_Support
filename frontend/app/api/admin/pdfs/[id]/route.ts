import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }) {
    const cookies = req.headers.get("cookie") ?? "";
    const { id } = await params;

    const djangoRes = await safeFetch(`${baseUrl}/api/v1/admin/pdfs/${id}/`, {
        method: "DELETE",
        headers: { "Cookie": cookies },
    });

    // 204 No Content — no body to parse
    if (djangoRes.status === 204) {
        return NextResponse.json({ message: "Deleted" });
    }

    const data = await djangoRes.json();
    if (!djangoRes.ok) {
        return NextResponse.json(data, { status: djangoRes.status });
    }

    return NextResponse.json(data);
}
