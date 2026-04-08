import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/logger";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(req: NextRequest) {
  const cookies = req.headers.get("cookie") ?? "";

  try {
    logger.info("pdfs baseUrl:", baseUrl);
    logger.info("pdfs cookies:", cookies);

    const djangoRes = await fetch(`${baseUrl}/api/v1/admin/pdfs/`, {
      headers: { "Cookie": cookies },
    });

    logger.info("django pdfs status:", djangoRes.status);

    if (!djangoRes.ok) {
      const data = await djangoRes.json();
      return NextResponse.json(data, { status: djangoRes.status });
    }

    const data = await djangoRes.json();
    return NextResponse.json(data);

  } catch (err) {
    logger.error("pdfs route error:", err);
    return NextResponse.json(
      { detail: "Internal server error", error: String(err) },
      { status: 500 }
    );
  }
}
