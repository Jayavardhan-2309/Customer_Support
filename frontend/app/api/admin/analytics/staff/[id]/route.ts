import { safeFetch } from "@/app/api/_lib/safeFetch";
import { logger } from "@/logger";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookies = req.headers.get("cookie") ?? "";
  const { id } = await params;

  try {
    const res = await safeFetch(
      `${baseUrl}/api/v1/admin/analytics/staff/${id}/`, // ← fix path
      {
        method: "GET",
        headers: { Cookie: cookies },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    logger.error("Staff analytics fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch staff analytics" },
      { status: 500 }
    );
  }
}