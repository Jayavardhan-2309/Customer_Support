import { NextResponse } from "next/server";
import api from "@/src/lib/axios";
const baseUrl= api.defaults.baseURL;

export async function GET(req: Request) {
  const backendRes = await fetch(`${baseUrl}/api/v1/me/`, {
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
    credentials: "include",
  });

  if (!backendRes.ok) {
    return NextResponse.json(
      { detail: "Unauthorized" },
      { status: 401 }
    );
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}