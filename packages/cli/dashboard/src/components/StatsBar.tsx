interface StatsBarProps {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  debugs: number;
}

export function StatsBar({ total, errors, warnings, infos, debugs }: StatsBarProps) {
  return (
    <div style={styles.stats}>
      <span>Total: {total}</span>
      <span style={styles.error}>Errores: {errors}</span>
      <span style={styles.warn}>Warnings: {warnings}</span>
      <span style={styles.info}>Info: {infos}</span>
      <span style={styles.debug}>Debug: {debugs}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stats: {
    display: "flex",
    gap: 16,
    fontSize: 11,
    color: "#8b949e",
    alignItems: "center",
  },
  error: {
    color: "#f85149",
  },
  warn: {
    color: "#f0883e",
  },
  info: {
    color: "#58a6ff",
  },
  debug: {
    color: "#8b949e",
  },
};
