import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.warn("GOOGLE_AI_API_KEY is not configured - Gemini features will not work");
}

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Upload a file to Google's File API
export async function uploadFile(file: File) {
  if (!ai) throw new Error("Gemini AI not configured");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Normalize the filename to NFC form to convert combined Unicode characters
    // (e.g., u + combining diaeresis) to precomposed form (e.g., ü)
    // This prevents "Cannot convert argument to a ByteString" errors
    const normalizedFileName = file.name.normalize("NFC");

    // Create a temporary file path (for Node.js environment)
    const tempPath = `/tmp/${Date.now()}-${normalizedFileName}`;
    const fs = await import("fs");
    fs.writeFileSync(tempPath, buffer);

    // Upload the file using the Files API
    const uploadedFile = await ai.files.upload({
      file: tempPath,
      config: {
        mimeType: file.type,
        displayName: normalizedFileName,
      },
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    return uploadedFile;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// List all uploaded files
export async function listFiles() {
  if (!ai) throw new Error("Gemini AI not configured");

  try {
    const response = await ai.files.list({});
    const files = [];

    // The response is a pager, iterate through it
    for await (const file of response) {
      files.push(file);
    }

    return files;
  } catch (error) {
    console.error("Error listing files:", error);
    throw error;
  }
}

// Delete a file
export async function deleteFile(fileName: string) {
  if (!ai) throw new Error("Gemini AI not configured");

  try {
    await ai.files.delete({ name: fileName });
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

// ============================================
// FILE SEARCH STORE FUNCTIONS (for RAG)
// ============================================

// Create a new File Search Store
export async function createFileSearchStore(displayName: string) {
  if (!ai) throw new Error("Gemini AI not configured");

  try {
    const store = await ai.fileSearchStores.create({
      config: {
        displayName,
      },
    });
    return store;
  } catch (error) {
    console.error("Error creating file search store:", error);
    throw error;
  }
}

// Upload a file to a File Search Store
export async function uploadToFileSearchStore(
  storeName: string,
  file: File
): Promise<{ documentName: string; displayName: string }> {
  if (!ai) throw new Error("Gemini AI not configured");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const normalizedFileName = file.name.normalize("NFC");
    const tempPath = `/tmp/doc-${Date.now()}-${normalizedFileName}`;

    const fs = await import("fs");
    fs.writeFileSync(tempPath, buffer);

    // Upload to File Search Store (returns a Long Running Operation)
    const operation = await ai.fileSearchStores.uploadToFileSearchStore({
      fileSearchStoreName: storeName,
      file: tempPath,
      config: {
        displayName: normalizedFileName,
      },
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    // Poll for operation completion
    let result = operation;
    let attempts = 0;
    const maxAttempts = 30; // Max 30 attempts (about 90 seconds)

    while (!result.done && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
      result = await ai.operations.get({ operation: result });
      attempts++;
    }

    if (!result.done) {
      throw new Error("Upload operation timed out");
    }

    // Extract document name from result
    const documentName = (result.response as { documentName?: string })?.documentName || "";

    return {
      documentName,
      displayName: normalizedFileName,
    };
  } catch (error) {
    console.error("Error uploading to file search store:", error);
    throw error;
  }
}

// List documents in a File Search Store
export async function listFileSearchStoreDocuments(storeName: string) {
  if (!ai) throw new Error("Gemini AI not configured");

  try {
    const response = await ai.fileSearchStores.documents.list({
      parent: storeName,
    });

    const documents = [];
    for await (const doc of response) {
      documents.push(doc);
    }

    return documents;
  } catch (error) {
    console.error("Error listing file search store documents:", error);
    throw error;
  }
}

// Delete a document from a File Search Store
export async function deleteFileSearchStoreDocument(
  storeName: string,
  documentName: string
) {
  if (!ai) throw new Error("Gemini AI not configured");

  try {
    await ai.fileSearchStores.documents.delete({
      name: documentName,
      config: { force: true },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting file search store document:", error);
    throw error;
  }
}

// Delete an entire File Search Store
export async function deleteFileSearchStore(storeName: string) {
  if (!ai) throw new Error("Gemini AI not configured");

  try {
    await ai.fileSearchStores.delete({ name: storeName });
    return { success: true };
  } catch (error) {
    console.error("Error deleting file search store:", error);
    throw error;
  }
}
