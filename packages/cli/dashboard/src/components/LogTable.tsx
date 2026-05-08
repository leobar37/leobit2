import type { LogEntry } from "../types";

interface LogTableProps {
  entries: LogEntry[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getEntryId(entry: LogEntry, index: number): string {
  return `${entry.time}-${entry.service}-${entry.level}-${index}`;
}

export function LogTable({
  entries,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
}: LogTableProps) {
  if (entries.length === 0) {
    return (
      <div style={styles.empty}>
        No hay logs. Ejecuta <code>bun run avileo dev</code> para generar logs.
      </div>
    );
  }

  const allIds = entries.map((e, i) => getEntryId(e, i));
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  return (
    <main style={styles.main}>
      <div style={styles.headerRow}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => {
            if (allSelected) {
              onClearSelection();
            } else {
              onSelectAll(allIds);
            }
          }}
          style={styles.checkbox}
        />
        <span style={styles.headerCell}>Hora</span>
        <span style={styles.headerCell}>Servicio</span>
        <span style={styles.headerCell}>Nivel</span>
        <span style={{ ...styles.headerCell, flex: 1 }}>Mensaje</span>
      </div>
      {entries.map((entry, i) => {
        const id = getEntryId(entry, i);
        const time = new Date(entry.time).toLocaleTimeString("es-ES", { hour12: false });
        const isSelected = selectedIds.has(id);
        const isError = entry.level === "error";
        const isWarn = entry.level === "warn";

        return (
          <div
            key={id}
            style={{
              ...styles.row,
              ...(isError ? styles.rowError : {}),
              ...(isWarn ? styles.rowWarn : {}),
              ...(isSelected ? styles.rowSelected : {}),
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(id)}
              style={styles.checkbox}
            />
            <span style={styles.time}>{time}</span>
            <span style={styles.service}>{entry.service}</span>
            <span style={{ ...styles.level, ...levelStyles[entry.level] }}>
              {entry.level.toUpperCase()}
            </span>
            <span
              style={styles.msg}
              dangerouslySetInnerHTML={{ __html: escapeHtml(entry.msg) }}
            />
          </div>
        );
      })}
    </main>
  );
}

const levelStyles: Record<string, React.CSSProperties> = {
  error: { color: "#f85149" },
  warn: { color: "#f0883e" },
  info: { color: "#58a6ff" },
  debug: { color: "#8b949e" },
};

const styles: Record<string, React.CSSProperties> = {
  main: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 20px",
    fontSize: 12,
    lineHeight: 1.6,
  },
  empty: {
    textAlign: "center",
    color: "#6e7681",
    padding: 40,
  },
  headerRow: {
    display: "flex",
    gap: 8,
    padding: "4px 0",
    borderBottom: "2px solid #30363d",
    fontWeight: 600,
    color: "#8b949e",
    position: "sticky",
    top: 0,
    background: "#0d1117",
  },
  headerCell: {
    minWidth: 45,
    flexShrink: 0,
  },
  row: {
    display: "flex",
    gap: 8,
    padding: "2px 0",
    borderBottom: "1px solid #161b22",
    fontFamily: "'SF Mono', Monaco, monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    alignItems: "flex-start",
  },
  rowError: {
    borderLeft: "3px solid #f85149",
    paddingLeft: 4,
    background: "rgba(248, 81, 73, 0.05)",
  },
  rowWarn: {
    borderLeft: "3px solid #f0883e",
    paddingLeft: 4,
    background: "rgba(240, 136, 62, 0.05)",
  },
  rowSelected: {
    background: "rgba(88, 166, 255, 0.1)",
  },
  checkbox: {
    width: 14,
    height: 14,
    marginTop: 2,
    flexShrink: 0,
  },
  time: {
    color: "#6e7681",
    minWidth: 70,
    flexShrink: 0,
  },
  service: {
    color: "#8b949e",
    minWidth: 60,
    flexShrink: 0,
  },
  level: {
    minWidth: 45,
    flexShrink: 0,
    fontWeight: 600,
  },
  msg: {
    color: "#c9d1d9",
    flex: 1,
  },
};
