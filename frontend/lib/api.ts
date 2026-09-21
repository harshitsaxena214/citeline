import { Document, UploadResponse, ChatRequest, ChatResponse } from "./types";
import { getSessionId } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const sessionId = getSessionId();
  const headers = new Headers(options.headers || {});
  headers.set("X-Session-Id", sessionId);

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = "An error occurred";
    if (response.status === 429) {
      detail = "Too many requests, please wait a minute.";
    } else if (response.status === 413) {
      detail = "File too large.";
    } else {
      try {
        const err = await response.json();
        if (err.detail) detail = err.detail;
      } catch {
        // ignore
      }
    }
    throw new Error(detail);
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

export async function health(): Promise<{ status: string }> {
  try {
    return await fetchApi("/health");
  } catch {
    throw new Error("Could not reach the server, try again.");
  }
}

export async function listDocuments(): Promise<Document[]> {
  return await fetchApi("/documents");
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return await fetchApi("/documents", {
    method: "POST",
    body: formData,
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await fetchApi(`/documents/${id}`, {
    method: "DELETE",
  });
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  return await fetchApi("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}
