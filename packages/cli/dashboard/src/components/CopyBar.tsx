import type { LogEntry } from "../types";

interface CopyBarProps {
  entries: LogEntry[];
  selectedIds: Set<string>;
  onFeedback: (msg: string) => void;
}

function getEntryId(entry: LogEntry, index: number): string {
  return `${entry.time}-${entry.service}-${entry.level}-${index}`;
}

async function copyToClipboard(data: unknown, onFeedback: (msg: string) => void) {
  try {
    const json = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(json);
    const count = Array.isArray(data) ? data.length : 1;
    onFeedback(`Copiados ${count} logs al portapapeles`);
  } catch {
    onFeedback("No se pudo copiar. Revisa permisos del navegador.");
  }
}

export function CopyBar({ entries, selectedIds, onFeedback }: CopyBarProps) {
  const handleCopyAll = () => {
    copyToClipboard(entries, onFeedback);
  };

  const handleCopyErrors = () => {
    const errors = entries.filter((e) => e.level === "error");
    copyToClipboard(errors, onFeedback);
  };

  const handleCopyInfo = () => {
    const infos = entries.filter((e) => e.level === "info");
    copyToClipboard(infos, onFeedback);
  };

  const handleCopySelected = () => {
    const selected = entries.filter((e, i) => selectedIds.has(getEntryId(e, i)));
    if (selected.length === 0) {
      onFeedback("Ninguna fila seleccionada");
      return;
    }
    copyToClipboard(selected, onFeedback);
  };

  return (
    <div style={styles.bar}>
      <span style={styles.label}>Copiar JSON:</span>
      <button style={styles.btn} onClick={handleCopyAll}>
        Ultimos logs
      </button>
      <button style={{ ...styles.btn, ...styles.btnError }} onClick={handleCopyErrors}>
        Ultimos errores
      </button>
      <button style={{ ...styles.btn, ...styles.btnInfo }} onClick={handleCopyInfo}>
        Ultima info
      </button>
      <button style={styles.btn} onClick={handleCopySelected}>
        Seleccion ({selectedIds.size})
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    background: "#161b22",
    borderBottom: "1px solid #30363d",
    padding: "6px 20px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
  },
  label: {
    color: "#8b949e",
    marginRight: 4,
  },
  btn: {
    background: "#21262d",
    border: "1px solid #30363d",
    color: "#c9d1d9",
    padding: "3px 10px",
    borderRadius: 4,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnError: {
    borderColor: "#f85149",
    color: "#f85149",
  },
  btnInfo: {
    borderColor: "#58a6ff",
    color: "#58a6ff",
  },
};
