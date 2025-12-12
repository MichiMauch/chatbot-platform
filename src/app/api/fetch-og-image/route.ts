import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChatBot/1.0)",
      },
    });
    clearTimeout(timeout);

    const html = await response.text();
    const $ = cheerio.load(html);

    // OG-Image in Prioritätsreihenfolge suchen
    let imageUrl =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('link[rel="image_src"]').attr("href") ||
      $('meta[property="article:image"]').attr("content");

    // Relative URLs zu absoluten konvertieren
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = new URL(imageUrl, url).toString();
    }

    return NextResponse.json(
      { ogImage: imageUrl || null },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch (error) {
    return NextResponse.json({ ogImage: null });
  }
}
