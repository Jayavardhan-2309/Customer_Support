import { safeFetch } from "@/app/api/_lib/safeFetch";
import { logger } from "@/logger";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(req: NextRequest) {
  try {
    const backendRes = await safeFetch(`${baseUrl}/api/v1/chat/history/`, {
      headers: {
        "Cookie": req.headers.get("cookie") || "",
      },
    });

    if (!backendRes.ok) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);

  } catch (err) {
    logger.error("chat history error:", err);
    return NextResponse.json({ detail: "failed to get chat history" }, { status: 500 });
  }
}