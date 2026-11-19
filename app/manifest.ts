import type { MetadataRoute } from "next";

import { SITE_PRODUCT } from "@/lib/site/product";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_PRODUCT.name,
    short_name: SITE_PRODUCT.shortName,
    description: SITE_PRODUCT.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f2eb",
    theme_color: "#f5f2eb",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
