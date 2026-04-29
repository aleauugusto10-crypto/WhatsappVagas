import React from "react";
export default function Card({ children, className = "" }) {
  return <article className={`card ${className}`}>{children}</article>;
}
