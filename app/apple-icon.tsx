import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #faf9f7 0%, #ede9fe 40%, #ecfccb 100%)",
          color: "#3f3f2a",
          fontSize: 96,
          fontWeight: 650,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
