import { NextRequest, NextResponse } from "next/server";
import api from "@/src/lib/axios";

const baseUrl = api.defaults.baseURL?.replace(/\/api\/v1\/?$/, "");
//              ^^^ strips /api/v1/ so we don't double it

export async function GET(req: NextRequest) {
  console.log("me baseUrl:", baseUrl);
  console.log("cookies:", req.headers.get("cookie"));

  const backendRes = await fetch(`${baseUrl}/api/v1/me/`, {
    headers: {
      "Cookie": req.headers.get("cookie") || "",
    },
  });

  console.log("django me status:", backendRes.status);

  if (!backendRes.ok) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}