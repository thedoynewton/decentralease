import React, { useState } from "react";

interface InputDamageFeeProps {
  onSubmit: (fee: number) => void;
  disabled?: boolean;
}

export default function InputDamageFee({
  onSubmit,
  disabled,
}: InputDamageFeeProps) {
  const [fee, setFee] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = Number(fee.replace(",", "."));
        if (isNaN(parsed) || parsed < 0) {
          alert("Please enter a valid value (e.g. 0.01)");
          return;
        }
        onSubmit(parsed);
        setFee("");
      }}
      style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}
    >
      <input
        type="number"
        min="0"
        step="any"
        placeholder="Enter damage fee"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        disabled={disabled}
        style={{
          padding: "8px",
          borderRadius: 4,
          border: "1px solid #cbd5e1",
          width: 120,
          fontSize: 16, // Prevents mobile zoom
        }}
      />
      <button
        type="submit"
        disabled={disabled}
        style={{
          background: "#eab308",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 18px",
          fontWeight: 500,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        Submit Fee
      </button>
    </form>
  );
}
