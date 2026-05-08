import { useState } from "react";

interface FiltersBarProps {
  service: string;
  level: string;
  grep: string;
  lines: number;
  paused: boolean;
  onServiceChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onGrepChange: (v: string) => void;
  onLinesChange: (v: number) => void;
  onApply: () => void;
  onClear: () => void;
  onTogglePause: () => void;
}

export function FiltersBar({
  service,
  level,
  grep,
  lines,
  paused,
  onServiceChange,
  onLevelChange,
  onGrepChange,
  onLinesChange,
  onApply,
  onClear,
  onTogglePause,
}: FiltersBarProps) {
  return (
    <header style={styles.header}>
      <h1 style={styles.title}>Avileo Logs Dashboard</h1>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Servicio</label>
        <select
          style={styles.select}
          value={service}
          onChange={(e) => onServiceChange(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="backend">backend</option>
          <option value="app">app</option>
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Nivel</label>
        <select
          style={styles.select}
          value={level}
          onChange={(e) => onLevelChange(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="error">error</option>
          <option value="warn">warn</option>
          <option value="info">info</option>
          <option value="debug">debug</option>
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Buscar</label>
        <input
          type="text"
          style={{ ...styles.select, width: 140 }}
          placeholder="texto..."
          value={grep}
          onChange={(e) => onGrepChange(e.target.value)}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Líneas</label>
        <input
          type="number"
          style={{ ...styles.select, width: 60 }}
          value={lines}
          min={10}
          max={1000}
          onChange={(e) => onLinesChange(parseInt(e.target.value, 10) || 100)}
        />
      </div>

      <button style={styles.btnPrimary} onClick={onApply}>
        Aplicar
      </button>
      <button style={styles.btnSecondary} onClick={onClear}>
        Limpiar
      </button>
      <button style={styles.btnSecondary} onClick={onTogglePause}>
        {paused ? "Reanudar" : "Pausar"}
      </button>

      <div style={styles.status}>
        <span
          style={{
            ...styles.dot,
            background: paused ? "#f0883e" : "#238636",
            animation: paused ? "none" : "pulse 2s infinite",
          }}
        />
        <span>{paused ? "Pausado" : "En vivo"}</span>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "#161b22",
    borderBottom: "1px solid #30363d",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 16,
    color: "#58a6ff",
    marginRight: "auto",
    margin: 0,
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: "#8b949e",
  },
  select: {
    background: "#21262d",
    border: "1px solid #30363d",
    color: "#c9d1d9",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "inherit",
  },
  btnPrimary: {
    background: "#238636",
    border: "none",
    color: "white",
    padding: "4px 12px",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "#21262d",
    border: "1px solid #30363d",
    color: "#c9d1d9",
    padding: "4px 12px",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
  },
  status: {
    fontSize: 11,
    color: "#8b949e",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
};
