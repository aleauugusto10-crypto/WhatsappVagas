import React from "react";
export function Loading() {
  return <div className="status-box">Carregando informações...</div>;
}

export function ErrorBox({ message }) {
  return <div className="status-box error">Erro: {message}</div>;
}

export function Empty({ message = "Nada encontrado no momento." }) {
  return <div className="status-box">{message}</div>;
}
