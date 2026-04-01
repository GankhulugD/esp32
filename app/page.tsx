"use client";

export default function Home() {
  const CAM_URL = "http://10.139.165.186:81/stream";

  return (
    <main
      style={{
        backgroundColor: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ color: "#00ff00", marginBottom: "20px" }}>
        PET FEEDER CAM - LIVE
      </h1>

      <div
        style={{
          width: "90%",
          maxWidth: "800px",
          border: "5px solid #222",
          borderRadius: "15px",
          overflow: "hidden",
          boxShadow: "0 0 20px rgba(0,255,0,0.2)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CAM_URL}
          alt="Stream Loading..."
          style={{ width: "100%", display: "block" }}
          onError={(e) => {
            // TypeScript-д зориулсан Type Casting
            const target = e.target as HTMLImageElement;
            target.src =
              "https://via.placeholder.com/800x600?text=Camera+Not+Found+Check+IP";
          }}
        />
      </div>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <p>
          Current IP: <span style={{ color: "#00ff00" }}>10.139.165.186</span>
        </p>
        <p style={{ fontSize: "12px", color: "#666" }}>
          Нэг Wi-Fi-д холбогдсон байх ёстойг анхаарна уу.
        </p>
      </div>
    </main>
  );
}
