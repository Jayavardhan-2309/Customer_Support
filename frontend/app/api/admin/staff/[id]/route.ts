import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/staff/{id} — remove a staff member
const baseUrl= process.env.DJANGO_BASE_URL;
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookies = req.headers.get("cookie") ?? "";
    const { id } = await params;

    const djangoRes = await safeFetch(`${baseUrl}/api/v1/admin/staff/${id}/`, {
        method: "DELETE",
        headers: { "Cookie": cookies },
    });

    if (djangoRes.status === 204) {
        return NextResponse.json({ message: "Deleted" });
    }

    const data = await djangoRes.json();
    if (!djangoRes.ok) {
        return NextResponse.json(data, { status: djangoRes.status });
    }

    return NextResponse.json(data);
}

// PATCH /api/staff/{id} — toggle availability
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookies = req.headers.get("cookie") ?? "";
    const { id } = await params;

    const djangoRes = await safeFetch(
        `${baseUrl}/api/v1/admin/staff/${id}/toggle/`,
        {
            method: "PATCH",
            headers: { "Cookie": cookies },
        }
    );

    const data = await djangoRes.json();
    if (!djangoRes.ok) return NextResponse.json(data, { status: djangoRes.status });
    return NextResponse.json(data);
}