import { safeFetch } from "@/app/api/_lib/safeFetch";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/logger";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(req: NextRequest) {
  const cookies = req.headers.get("cookie") ?? "";

  try {
    const djangoRes = await safeFetch(`${baseUrl}/api/v1/admin/pdfs/`, {
      headers: { "Cookie": cookies },
    });

    if (!djangoRes.ok) {
      const data = await djangoRes.json();
      return NextResponse.json(data, { status: djangoRes.status });
    }

    const data = await djangoRes.json();
    return NextResponse.json(data);

  } catch (err) {
    logger.error("pdfs route error:", err);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
