import React from "react";
export default function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="section-header">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
