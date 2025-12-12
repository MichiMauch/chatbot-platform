import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// MIME-Types für verschiedene Dateitypen
const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".rtf": "application/rtf",
};

// GET /api/uploads/[...path] - Datei aus uploads/ ausliefern
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    // Pfad zusammenbauen und dekodieren
    const requestedPath = pathSegments.map(decodeURIComponent).join("/");

    // Sicherheit: Path-Traversal verhindern
    const normalizedPath = path.normalize(requestedPath);
    if (normalizedPath.includes("..") || path.isAbsolute(normalizedPath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Absoluten Pfad erstellen und prüfen
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, normalizedPath);

    // Sicherheit: Nur Dateien im uploads-Verzeichnis erlauben
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Prüfen ob Datei existiert
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Prüfen ob es eine Datei ist (nicht Verzeichnis)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // MIME-Type ermitteln
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    // Datei lesen und ausliefern
    const fileContent = fs.readFileSync(filePath);

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": stats.size.toString(),
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/uploads] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Datei" },
      { status: 500 }
    );
  }
}
