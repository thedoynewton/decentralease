import React, { useState } from "react";

interface InputDamageFeeProps {
  onSubmit: (fee: number) => void;
  disabled?: boolean;
  securityDeposit: number;
}

export default function InputDamageFee({
  onSubmit,
  disabled,
  securityDeposit,
}: InputDamageFeeProps) {
  const [fee, setFee] = useState("");

  const parsedFee = Number(fee.replace(",", "."));
  const isValid = !isNaN(parsedFee) && parsedFee >= 0;
  const difference = isValid ? parsedFee - securityDeposit : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValid) {
          alert("Please enter a valid value (e.g. 0.01)");
          return;
        }
        onSubmit(parsedFee);
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
      </div>
      <span style={{ marginTop: 4, color: "#64748b", fontWeight: 500 }}>
        Security Deposit: {securityDeposit} ETH
      </span>
      <span style={{ marginTop: 4, color: "#2563eb", fontWeight: 500 }}>
        {isValid && difference !== null
          ? `Calculated payable/remaining fee: ${
              difference > 0 ? "+" : ""
            }${difference.toFixed(10)} ETH`
          : "Enter a valid fee to see the difference"}
      </span>
    </form>
  );
}
