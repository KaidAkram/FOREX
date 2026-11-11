import { NextRequest, NextResponse } from "next/server";
import {
  parseCountryCodesParam,
  parseImportanceLevelsParam,
} from "@/lib/biquoteCalendar";
import { fetchCalendarFromBiquote } from "@/lib/biquoteServer";

export const dynamic = "force-dynamic";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const countries = parseCountryCodesParam(sp.get("countries"), true);
    const importanceLevels = parseImportanceLevelsParam(sp.get("importance"));
    const fromRaw = sp.get("from");
    const toRaw = sp.get("to");

    const from = fromRaw && ISO_DATE_RE.test(fromRaw) ? fromRaw : undefined;
    const to = toRaw && ISO_DATE_RE.test(toRaw) ? toRaw : undefined;

    const events = await fetchCalendarFromBiquote({
      countries,
      importanceLevels,
      from,
      to,
    });

    return NextResponse.json({
      source: "biquote.io",
      count: events.length,
      countries,
      importance: importanceLevels,
      fetchedAt: new Date().toISOString(),
      events,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch economic calendar from Biquote API.",
        source: "biquote.io",
      },
      { status: 502 }
    );
  }
}

