import { NextRequest, NextResponse } from "next/server";

// DELETE /api/admin/staff/{id} — remove a staff member
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookies = req.headers.get("cookie") ?? "";
    const { id } = await params;

    const djangoRes = await fetch(
        `http://localhost:8000/api/v1/admin/staff/${id}/`,
        {
            method: "DELETE",
            headers: { "Cookie": cookies },
        }
    );

    const data = await djangoRes.json();
    if (!djangoRes.ok) return NextResponse.json(data, { status: djangoRes.status });
    return NextResponse.json(data);
}

// PATCH /api/admin/staff/{id} — toggle availability
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookies = req.headers.get("cookie") ?? "";
    const { id } = await params;

    const djangoRes = await fetch(
        `http://localhost:8000/api/v1/admin/staff/${id}/toggle/`,
        {
            method: "PATCH",
            headers: { "Cookie": cookies },
        }
    );

    const data = await djangoRes.json();
    if (!djangoRes.ok) return NextResponse.json(data, { status: djangoRes.status });
    return NextResponse.json(data);
}