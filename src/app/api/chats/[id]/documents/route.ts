import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { chats, teamMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requirePermission, isErrorResponse } from "@/lib/rbac";
import {
  createFileSearchStore,
  uploadToFileSearchStore,
  deleteFileSearchStoreDocument,
} from "@/lib/gemini";
import fs from "fs";
import path from "path";

interface FileMetadata {
  documentName: string;
  displayName: string;
  uploadedAt: string;
  localPath: string;
  mimeType: string;
  sizeBytes: number;
}

// GET /api/chats/[id]/documents - Liste der Dokumente
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await requirePermission("chats:view");
    if (isErrorResponse(result)) return result;

    // Chat laden
    const chat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    if (!chat) {
      return NextResponse.json({ error: "Chat nicht gefunden" }, { status: 404 });
    }

    // Team-Membership prüfen
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
      })
    );

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    // Files aus JSON-Feld parsen
    const files: FileMetadata[] = chat.files ? JSON.parse(chat.files) : [];

    return NextResponse.json({ files });
  } catch (error) {
    console.error("[GET /api/chats/documents] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Dokumente" },
      { status: 500 }
    );
  }
}

// POST /api/chats/[id]/documents - Dokument hochladen
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await requirePermission("chats:edit");
    if (isErrorResponse(result)) return result;

    // Chat laden
    const chat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    if (!chat) {
      return NextResponse.json({ error: "Chat nicht gefunden" }, { status: 404 });
    }

    // Team-Membership prüfen
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
      })
    );

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    // FormData mit Datei empfangen
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // File Search Store erstellen falls noch nicht vorhanden
    let storeName = chat.fileSearchStoreName;

    if (!storeName) {
      console.log("[POST /api/chats/documents] Creating new file search store");
      const store = await createFileSearchStore(`chat-${chat.id}`);
      storeName = store.name!;

      // Store-Name im Chat speichern
      await withRetry(() =>
        db
          .update(chats)
          .set({
            fileSearchStoreName: storeName,
            updatedAt: sql`(unixepoch())`,
          })
          .where(eq(chats.id, id))
      );
    }

    // Datei zu File Search Store hochladen
    console.log("[POST /api/chats/documents] Uploading file:", file.name);
    const uploadResult = await uploadToFileSearchStore(storeName, file);

    // Datei lokal speichern
    const uploadsDir = path.join(process.cwd(), "uploads", id);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const normalizedFileName = file.name.normalize("NFC");
    const localFileName = `doc-${Date.now()}-${normalizedFileName}`;
    const localFilePath = path.join(uploadsDir, localFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(localFilePath, buffer);

    const localPath = `${id}/${localFileName}`;
    console.log("[POST /api/chats/documents] File saved locally:", localPath);

    // Datei-Metadaten zu files Array hinzufügen
    const existingFiles: FileMetadata[] = chat.files ? JSON.parse(chat.files) : [];
    const newFile: FileMetadata = {
      documentName: uploadResult.documentName,
      displayName: uploadResult.displayName,
      uploadedAt: new Date().toISOString(),
      localPath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
    existingFiles.push(newFile);

    // Files im Chat speichern
    await withRetry(() =>
      db
        .update(chats)
        .set({
          files: JSON.stringify(existingFiles),
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(chats.id, id))
    );

    console.log("[POST /api/chats/documents] File uploaded successfully:", uploadResult.displayName);
    return NextResponse.json({
      success: true,
      file: newFile,
    });
  } catch (error) {
    console.error("[POST /api/chats/documents] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Hochladen" },
      { status: 500 }
    );
  }
}

// DELETE /api/chats/[id]/documents - Dokument löschen
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentName = searchParams.get("documentName");

    if (!documentName) {
      return NextResponse.json(
        { error: "documentName fehlt" },
        { status: 400 }
      );
    }

    const result = await requirePermission("chats:edit");
    if (isErrorResponse(result)) return result;

    // Chat laden
    const chat = await withRetry(() =>
      db.query.chats.findFirst({
        where: eq(chats.id, id),
      })
    );

    if (!chat) {
      return NextResponse.json({ error: "Chat nicht gefunden" }, { status: 404 });
    }

    // Team-Membership prüfen
    const membership = await withRetry(() =>
      db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, result.userId),
      })
    );

    if (!membership || membership.teamId !== chat.teamId) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    if (!chat.fileSearchStoreName) {
      return NextResponse.json(
        { error: "Kein File Search Store vorhanden" },
        { status: 400 }
      );
    }

    // Dokument aus File Search Store löschen
    await deleteFileSearchStoreDocument(chat.fileSearchStoreName, documentName);

    // Dokument aus files Array entfernen
    const existingFiles: FileMetadata[] = chat.files ? JSON.parse(chat.files) : [];
    const fileToDelete = existingFiles.find((f) => f.documentName === documentName);
    const updatedFiles = existingFiles.filter((f) => f.documentName !== documentName);

    // Lokale Datei löschen
    if (fileToDelete?.localPath) {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const localFilePath = path.join(uploadsDir, fileToDelete.localPath);

      // Sicherheitscheck: Nur Dateien im uploads-Verzeichnis löschen
      if (localFilePath.startsWith(uploadsDir) && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log("[DELETE /api/chats/documents] Local file deleted:", fileToDelete.localPath);
      }
    }

    // Files im Chat speichern
    await withRetry(() =>
      db
        .update(chats)
        .set({
          files: JSON.stringify(updatedFiles),
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(chats.id, id))
    );

    console.log("[DELETE /api/chats/documents] File deleted:", documentName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/chats/documents] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen" },
      { status: 500 }
    );
  }
}
