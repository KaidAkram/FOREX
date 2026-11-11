import { NextRequest, NextResponse } from "next/server";
import {
  parseCountryCodesParam,
  parseImportanceLevelsParam,
} from "@/lib/biquoteCalendar";
import { fetchUpcomingFromBiquote } from "@/lib/biquoteServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const countries = parseCountryCodesParam(sp.get("countries"), true);
    const importanceLevels = parseImportanceLevelsParam(sp.get("importance"));
    const rawLimit = Number(sp.get("limit") || "20");
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(100, Math.trunc(rawLimit)))
      : 20;

    const events = await fetchUpcomingFromBiquote({
      countries,
      importanceLevels,
      limit,
    });

    return NextResponse.json({
      source: "biquote.io",
      now: new Date().toISOString(),
      count: events.length,
      countries,
      importance: importanceLevels,
      events,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch upcoming events from Biquote API.",
        source: "biquote.io",
      },
      { status: 502 }
    );
  }
}

