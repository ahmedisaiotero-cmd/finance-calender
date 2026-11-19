import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "linear-gradient(145deg, #faf9f7 0%, #ede9fe 40%, #ecfccb 100%)",
          color: "#3f3f2a",
          fontSize: 18,
          fontWeight: 650,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
