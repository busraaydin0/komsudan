import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          background: "#1a6b63",
          borderRadius: 112,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 168,
            height: 168,
            borderRadius: 999,
            background: "#f4eee4",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
