import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const QUOTATION_REFERENCE_DESCRIPTION = 'quotation_reference_image';
const QUOTATION_REFERENCE_BUCKET = 'evidences';

export interface QuotationReferenceImage {
  id: string;
  bucket: string | null;
  storagePath: string | null;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  url: string | null;
  createdAt: string;
}

type FileAttachmentRow = {
  id: string;
  bucket?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
};

async function getAttachmentUrl(row: FileAttachmentRow): Promise<string | null> {
  if (!row.bucket || !row.storage_path) return row.file_url || null;

  const { data, error } = await supabase.storage
    .from(row.bucket)
    .createSignedUrl(row.storage_path, 60 * 60);

  if (!error && data?.signedUrl) return data.signedUrl;

  if (row.bucket === QUOTATION_REFERENCE_BUCKET) return row.file_url || null;

  const { data: publicData } = supabase.storage
    .from(row.bucket)
    .getPublicUrl(row.storage_path);

  return publicData.publicUrl || null;
}

function normalizeReferenceImage(row: FileAttachmentRow, url: string | null): QuotationReferenceImage {
  return {
    id: row.id,
    bucket: row.bucket ?? null,
    storagePath: row.storage_path ?? null,
    fileName: row.file_name || 'Referencia de cotización',
    mimeType: row.mime_type ?? null,
    sizeBytes: Number(row.size_bytes ?? 0),
    url,
    createdAt: row.created_at,
  };
}

async function fetchReferenceRows(quotationId: string): Promise<FileAttachmentRow[]> {
  const { data, error } = await supabase
    .from('file_attachments')
    .select('id, bucket, storage_path, file_name, file_url, mime_type, size_bytes, created_at')
    .eq('entity_type', 'quotation')
    .eq('entity_id', quotationId)
    .eq('description', QUOTATION_REFERENCE_DESCRIPTION)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FileAttachmentRow[];
}

export async function fetchQuotationReferenceImage(quotationId: string): Promise<QuotationReferenceImage | null> {
  const rows = await fetchReferenceRows(quotationId);
  const row = rows[0];
  if (!row) return null;
  return normalizeReferenceImage(row, await getAttachmentUrl(row));
}

export async function deleteQuotationReferenceImages(quotationId: string): Promise<void> {
  const rows = await fetchReferenceRows(quotationId);
  if (rows.length === 0) return;

  const storagePathsByBucket = rows.reduce<Record<string, string[]>>((acc, row) => {
    if (!row.bucket || !row.storage_path) return acc;
    acc[row.bucket] = [...(acc[row.bucket] || []), row.storage_path];
    return acc;
  }, {});

  await Promise.all(
    Object.entries(storagePathsByBucket).map(([bucket, paths]) =>
      supabase.storage.from(bucket).remove(paths),
    ),
  );

  const ids = rows.map((row) => row.id);
  const { error } = await supabase
    .from('file_attachments')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function replaceQuotationReferenceImage(params: {
  quotationId: string;
  file: File;
  userId: string;
}): Promise<QuotationReferenceImage | null> {
  await deleteQuotationReferenceImages(params.quotationId);

  const extension = params.file.type === 'image/png' ? 'png' : 'jpg';
  const storagePath = `quotations/${params.quotationId}/reference-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(QUOTATION_REFERENCE_BUCKET)
    .upload(storagePath, params.file, {
      contentType: params.file.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('file_attachments')
    .insert({
      bucket: QUOTATION_REFERENCE_BUCKET,
      storage_path: storagePath,
      file_name: params.file.name,
      mime_type: params.file.type || 'image/jpeg',
      size_bytes: params.file.size,
      entity_type: 'quotation',
      entity_id: params.quotationId,
      uploaded_by_id: params.userId,
      description: QUOTATION_REFERENCE_DESCRIPTION,
    })
    .select('id, bucket, storage_path, file_name, file_url, mime_type, size_bytes, created_at')
    .single();

  if (error) {
    await supabase.storage.from(QUOTATION_REFERENCE_BUCKET).remove([storagePath]);
    throw error;
  }

  const row = data as FileAttachmentRow;
  return normalizeReferenceImage(row, await getAttachmentUrl(row));
}
