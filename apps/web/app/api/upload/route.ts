import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePresignedUpload, getPublicUrl } from "@repo/db/storage";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType } = await req.json() as {
    filename: string;
    contentType: string;
  };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(contentType)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const ext = filename.split(".").pop() ?? "jpg";
  const key = `uploads/${crypto.randomUUID()}.${ext}`;

  const { url, fields } = await generatePresignedUpload(key, contentType);
  const publicUrl = getPublicUrl(key);

  return NextResponse.json({ url, fields, publicUrl });
}
