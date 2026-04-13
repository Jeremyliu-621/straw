import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import {
  TASK_ATTACHMENTS_BUCKET,
  TASK_MAX_ATTACHMENT_SIZE_MB,
  TASK_ALLOWED_FILE_TYPES,
} from "@/constants";

const MAX_BYTES = TASK_MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${TASK_MAX_ATTACHMENT_SIZE_MB}MB limit` },
      { status: 400 }
    );
  }

  const allowed = TASK_ALLOWED_FILE_TYPES as readonly string[];
  if (file.type && !allowed.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const db = createServiceClient();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `drafts/${session.user.supabaseId}/${timestamp}/${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await db.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload failed:", uploadError);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = db.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .getPublicUrl(path);

  return NextResponse.json({
    url: urlData.publicUrl,
    filename: file.name,
    size: file.size,
    path,
  });
}
