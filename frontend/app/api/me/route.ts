import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const backendRes = await fetch("http://localhost:8000/api/v1/me/", {
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
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