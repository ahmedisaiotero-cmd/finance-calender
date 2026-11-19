import type { MetadataRoute } from "next";

import { robotsMetadata } from "@/lib/site/public-index";

export default function robots(): MetadataRoute.Robots {
  return robotsMetadata();
}
