import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(req: NextRequest) {
  const djangoRes = await safeFetch(`${baseUrl}/api/v1/organizations/`, {
    headers: { "Cookie": req.headers.get("cookie") || "" },
  });

  const data = await djangoRes.json();
  return NextResponse.json(data, { status: djangoRes.status });
}