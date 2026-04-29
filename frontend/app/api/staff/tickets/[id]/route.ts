import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const backendRes = await safeFetch(`${baseUrl}/api/v1/staff/tickets/${id}/`, {
    headers: { "Cookie": req.headers.get("cookie") || "" },
  });

  if (!backendRes.ok) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: backendRes.status });
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const backendRes = await safeFetch(`${baseUrl}/api/v1/staff/tickets/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Cookie": req.headers.get("cookie") || "",
    },
    body: JSON.stringify(body),
  });

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}