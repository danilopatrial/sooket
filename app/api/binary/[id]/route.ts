import { binaryDataService } from "@/lib/binary-data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ref = binaryDataService.getRef(id);
  if (!ref) return new Response(null, { status: 404 });
  const buf = await binaryDataService.read(id).catch(() => null);
  if (!buf) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": ref.mimeType,
      "Content-Length": String(ref.size),
    },
  });
}
