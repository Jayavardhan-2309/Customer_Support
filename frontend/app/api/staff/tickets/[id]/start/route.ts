import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const backendRes = await fetch(`${baseUrl}/api/v1/staff/tickets/${id}/start/`, {
    method: "PATCH",
    headers: { "Cookie": req.headers.get("cookie") || "" },
  });

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}