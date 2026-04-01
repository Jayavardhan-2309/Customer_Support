import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL?.replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    console.log("BASE URL:", baseUrl);

    const body = await req.json();

    const djangoRes = await fetch(`${baseUrl}/api/v1/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await djangoRes.text();
    console.log("RAW DJANGO RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid response from backend", raw: text },
        { status: 500 }
      );
    }

    if (!djangoRes.ok) {
      return NextResponse.json(data, { status: djangoRes.status });
    }

    const response = NextResponse.json(data);

    djangoRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        response.headers.append("Set-Cookie", value);
      }
    });

    return response;

  } catch (err: any) {
    console.error("ROUTE ERROR:", err);

    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}