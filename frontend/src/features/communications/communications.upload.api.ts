import { api } from "@/api/client";
import { AppDocument } from "@/types/types";

export type DocumentVisibility = "public" | "private" | "internal";

export interface UploadDocumentDTO {
  title: string;
  document_type:
    | "agenda"
    | "session"
    | "minutes"
    | "ordinance"
    | "resolution"
    | "report"
    | "forum"
    | "attachment";
  visibility?: DocumentVisibility;
  is_published?: 0 | 1;
  file: File; // PDF
}

/**
 * Upload a PDF to the existing Documents module.
 *
 * Backend expectation (matches your DocumentController create()):
 * POST /api/documents (multipart/form-data)
 * Fields: title, document_type, visibility, is_published, file
 */
export async function uploadDocument(dto: UploadDocumentDTO): Promise<AppDocument> {
  const form = new FormData();
  form.append("title", dto.title);
  form.append("document_type", dto.document_type);
  if (dto.visibility) form.append("visibility", dto.visibility);
  if (dto.is_published !== undefined) form.append("is_published", String(dto.is_published));
  form.append("file", dto.file);

  const res = await api.post("/api/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 180000,
  });

  // Support both: {document: {...}} or {...document}
  return (res.data?.document ?? res.data) as AppDocument;
}
