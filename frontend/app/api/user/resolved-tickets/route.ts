import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(req: NextRequest) {
  const backendRes = await safeFetch(`${baseUrl}/api/v1/user/resolved-tickets/`, {
    headers: { "Cookie": req.headers.get("cookie") || "" },
  });

  if (!backendRes.ok) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: backendRes.status });
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}