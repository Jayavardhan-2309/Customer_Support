import { NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;
export async function POST(req: Request) {
  const backendRes = await fetch(
    `${baseUrl}/api/v1/logout/`,
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