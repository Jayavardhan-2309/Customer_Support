import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const djangoRes = await safeFetch(`${baseUrl}/api/v1/signup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await djangoRes.json();

  return NextResponse.json(data, { status: djangoRes.status });
}