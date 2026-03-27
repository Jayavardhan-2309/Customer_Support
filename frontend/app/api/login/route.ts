import { NextRequest, NextResponse } from "next/server";
import api from "@/src/lib/axios";

const baseUrl = api.defaults.baseURL?.replace(/\/api\/v1\/?$/, "");

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log("login baseUrl:", baseUrl);

  const djangoRes = await fetch(`${baseUrl}/api/v1/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log("django status:", djangoRes.status);
  console.log("django set-cookie:", djangoRes.headers.get("set-cookie"));

  const data = await djangoRes.json();

  if (!djangoRes.ok) {
    return NextResponse.json(data, { status: djangoRes.status });
  }

  const response = NextResponse.json(data);

  // Forward every Set-Cookie header Django sends
  djangoRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      console.log("forwarding cookie:", value);
      response.headers.append("Set-Cookie", value);
    }
  });

  return response;
}