export interface Document {
  id: string;
  name: string;
  pages: number;
  chunk_count: number;
  created_at: string;
}

export interface UploadResponse {
  id: string;
  name: string;
  pages: number;
  chunks: number;
}

export interface Citation {
  document: string;
  page: number;
}

export interface ChatRequest {
  question: string;
  document_ids: string[];
}

export interface ChatResponse {
  answer: string;
  mode: "summarize" | "qa" | "compare";
  citations: Citation[];
  supported: boolean;
}

export interface ApiError {
  detail: string;
}
