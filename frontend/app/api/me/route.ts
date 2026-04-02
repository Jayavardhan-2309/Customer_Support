import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;
// No more importing axios or stripping /api/v1/ — clean and simple

export async function GET(req: NextRequest) {
  const backendRes = await fetch(`${baseUrl}/api/v1/me/`, {
    headers: {
      "Cookie": req.headers.get("cookie") || "",
    },
  });

  if (!backendRes.ok) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}