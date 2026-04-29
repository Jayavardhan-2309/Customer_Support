import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // await params
  const body = await req.json();

  const backendRes = await safeFetch(`${baseUrl}/api/v1/tickets/${id}/feedback/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": req.headers.get("cookie") || "",
    },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    return NextResponse.json({ detail: "Failed" }, { status: backendRes.status });
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}