import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookies = req.headers.get("cookie") ?? "";
    const { id } = await params;  // params is a Promise in Next.js 15

    const djangoRes = await fetch(
        `${baseUrl}/api/v1/admin/pdfs/${id}/`,  // router generates /pdfs/{id}/ not /pdfs/{id}/delete/
        {
            method: "DELETE",
            headers: {
                "Cookie": cookies,
            },
        }
    );

    const data = await djangoRes.json();

    if (!djangoRes.ok) {
        return NextResponse.json(data, { status: djangoRes.status });
    }

    return NextResponse.json(data);
}