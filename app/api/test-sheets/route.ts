import { NextResponse } from "next/server";
import { sheets } from "@/lib/google";

export async function GET() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: "A1:A1",
  });

  return NextResponse.json({ ok: true, value: res.data.values });
}

