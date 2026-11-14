import { NextRequest } from "next/server";
import { GET as getCatalogFeed } from "../api/catalog/feed/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set("format", "rss");
  const rssReq = new NextRequest(url.toString(), req);
  return getCatalogFeed(rssReq);
}
