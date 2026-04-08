import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/logger";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function POST(req: NextRequest) {
  const body = await req.json();


  const djangoRes = await fetch(`${baseUrl}/api/v1/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  logger.info("django status:", djangoRes.status);
  logger.info("django set-cookie:", djangoRes.headers.get("set-cookie"));

  const data = await djangoRes.json();

  if (!djangoRes.ok) {
    return NextResponse.json(data, { status: djangoRes.status });
  }

  const response = NextResponse.json(data);

  // Forward every Set-Cookie header Django sends
  djangoRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      logger.info("forwarding cookie:", value);
      response.headers.append("Set-Cookie", value);
    }
  });

  return response;
}