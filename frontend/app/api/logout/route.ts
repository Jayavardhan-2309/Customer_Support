import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const backendRes = await fetch(
    "http://localhost:8000/api/v1/logout/",
    {
      method: "POST",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    }
  );

  const response = NextResponse.json({ message: "Logged out" });

  // 🔑 forward cookie deletion to browser
  const setCookie = backendRes.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}