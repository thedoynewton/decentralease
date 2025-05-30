import React, { useState } from "react";

interface InputDamageFeeProps {
  onSubmit: (fee: string) => void;
  disabled?: boolean;
  securityDeposit: number;
}

// Helper to limit decimals to 10
function limitDecimals(value: string, decimals = 10) {
  if (!value.includes(".")) return value;
  const [whole, dec] = value.split(".");
  return `${whole}.${dec.slice(0, decimals)}`;
}

export default function InputDamageFee({
  onSubmit,
  disabled,
  securityDeposit,
}: InputDamageFeeProps) {
  const [fee, setFee] = useState("");

  // Limit decimals on input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(",", ".");
    if (val.includes(".")) {
      val = limitDecimals(val, 10);
    }
    setFee(val);
  };

  const parsedFee = Number(fee);
  const isValid = !isNaN(parsedFee) && parsedFee >= 0;
  const difference = isValid ? parsedFee - securityDeposit : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Always trim to 10 decimals before submitting
        const trimmedFee = limitDecimals(fee, 10);
        const parsedFee = Number(trimmedFee);
        if (isNaN(parsedFee) || parsedFee < 0) {
          alert("Please enter a valid value (e.g. 0.01)");
          return;
        }
        onSubmit(trimmedFee);
        setFee("");
      }}
      style={{
        marginTop: 12,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Enter damage fee"
          value={fee}
          onChange={handleChange}
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
      </div>
      <span style={{ marginTop: 4, color: "#64748b", fontWeight: 500 }}>
        Security Deposit: {securityDeposit} ETH
      </span>
      <span style={{ marginTop: 4, color: "#2563eb", fontWeight: 500 }}>
        {isValid && difference !== null
          ? `Calculated payable/remaining fee: ${
              difference > 0 ? "+" : ""
            }${difference.toFixed(8)} ETH`
          : "Enter a valid fee to see the difference"}
      </span>
    </form>
  );
}
