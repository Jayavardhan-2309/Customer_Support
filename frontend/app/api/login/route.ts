import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL; 
// set this in Vercel env vars as https://customer-support-1nng.onrender.com

export async function POST(req: NextRequest) {
  const body = await req.json();

  const djangoRes = await fetch(`${baseUrl}/api/v1/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await djangoRes.json();

  if (!djangoRes.ok) {
    return NextResponse.json(data, { status: djangoRes.status });
  }

  const response = NextResponse.json(data);

  // Forward the Set-Cookie headers from Django to the browser
  // Now cookie is scoped to vercel.app — browser will send it to all /api/* routes
  djangoRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("Set-Cookie", value);
    }
  });

  return response;
}