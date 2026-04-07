import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.DJANGO_BASE_URL;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookies = req.headers.get("cookie") ?? "";

  const res = await fetch(
    `${baseUrl}/api/v1/admin/staff/${params.id}/`,
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
}