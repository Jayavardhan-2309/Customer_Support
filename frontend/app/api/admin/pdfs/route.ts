import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(req: NextRequest) {
  const cookies = req.headers.get("cookie") ?? "";

  try {
    console.log("pdfs baseUrl:", baseUrl);
    console.log("pdfs cookies:", cookies);

    const djangoRes = await fetch(`${baseUrl}/api/v1/pdfs/`, {
      headers: { "Cookie": cookies },
    });

    console.log("django pdfs status:", djangoRes.status);

    if (!djangoRes.ok) {
      const data = await djangoRes.json();
      return NextResponse.json(data, { status: djangoRes.status });
    }

    const data = await djangoRes.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("pdfs route error:", err);
    return NextResponse.json(
      { detail: "Internal server error", error: String(err) },
      { status: 500 }
    );
  }
}
