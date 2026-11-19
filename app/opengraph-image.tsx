import { ImageResponse } from "next/og";

import { SITE_PRODUCT } from "@/lib/site/product";

export const alt = SITE_PRODUCT.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#f5f2eb",
          color: "#2b2a24",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", opacity: 0.55 }}>
          {SITE_PRODUCT.name}
        </div>
        <div style={{ marginTop: 24, fontSize: 64, fontWeight: 560, letterSpacing: -2, lineHeight: 1.1, maxWidth: 900 }}>
          {SITE_PRODUCT.tagline}
        </div>
      </div>
    ),
    size,
  );
}
