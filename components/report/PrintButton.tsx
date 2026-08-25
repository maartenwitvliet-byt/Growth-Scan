"use client";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary">
      Download / print rapport
    </button>
  );
}
