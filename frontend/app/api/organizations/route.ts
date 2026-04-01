import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(req: NextRequest) {
  const djangoRes = await fetch(`${baseUrl}/api/v1/organizations/`, {
    headers: { "Cookie": req.headers.get("cookie") || "" },
  });

  const data = await djangoRes.json();
  return NextResponse.json(data, { status: djangoRes.status });
}