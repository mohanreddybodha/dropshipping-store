import { NextRequest } from "next/server";
import { GET as getCatalogFeed } from "../api/catalog/feed/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set("format", "xml");
  const xmlReq = new NextRequest(url.toString(), req);
  return getCatalogFeed(xmlReq);
}
