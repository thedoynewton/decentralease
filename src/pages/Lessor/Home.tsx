import React from "react";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f7faff"
    }}>
      <h1 style={{ color: "#1976d2", fontSize: "2.2rem", marginBottom: "1rem" }}>
        Welcome, Lessor!
      </h1>
      <p style={{ color: "#444", fontSize: "1.1rem", maxWidth: 400, textAlign: "center" }}>
        Under maintenance. Please check back later for updates.
      </p>
    </div>
  );
}