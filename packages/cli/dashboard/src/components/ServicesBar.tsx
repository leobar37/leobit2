import type { AvileoConfig } from "../types";

interface ServicesBarProps {
  config: AvileoConfig | null;
}

export function ServicesBar({ config }: ServicesBarProps) {
  if (!config) {
    return (
      <div style={styles.bar}>
        <span style={styles.noConfig}>
          Sin config.json todavía. Ejecuta <code>bun run avileo dev</code>.
        </span>
      </div>
    );
  }

  const services = config.services;

  return (
    <div style={styles.bar}>
      {Object.entries(services).map(([name, svc]) => (
        <span key={name} style={styles.tag}>
          <span
            style={{
              ...styles.dot,
              background: name === "backend" ? "#22c55e" : "#3b82f6",
            }}
          />
          <span style={styles.name}>{name}:</span>
          <a href={svc.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
            {svc.url}
          </a>
        </span>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    background: "#161b22",
    borderBottom: "1px solid #30363d",
    padding: "8px 20px",
    display: "flex",
    gap: 12,
    fontSize: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  noConfig: {
    color: "#8b949e",
  },
  tag: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 8px",
    borderRadius: 4,
    background: "#21262d",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },
  name: {
    color: "#8b949e",
  },
  link: {
    color: "#58a6ff",
    textDecoration: "none",
  },
};
