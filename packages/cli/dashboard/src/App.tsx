import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLogs, fetchConfig } from "./api";
import type { LogEntry, AvileoConfig } from "./types";
import { FiltersBar } from "./components/FiltersBar";
import { ServicesBar } from "./components/ServicesBar";
import { StatsBar } from "./components/StatsBar";
import { LogTable } from "./components/LogTable";
import { CopyBar } from "./components/CopyBar";

export default function App() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<AvileoConfig | null>(null);
  const [service, setService] = useState("");
  const [level, setLevel] = useState("");
  const [grep, setGrep] = useState("");
  const [lines, setLines] = useState(100);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const mainRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (paused) return;
    setLoading(true);
    try {
      const data = await fetchLogs({ service, level, grep, lines });
      setEntries(data.entries);
    } catch (e) {
      console.error("Error fetching logs:", e);
    } finally {
      setLoading(false);
    }
  }, [service, level, grep, lines, paused]);

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchConfig();
      setConfig(data.config);
    } catch (e) {
      console.error("Error fetching config:", e);
    }
  }, []);

  useEffect(() => {
    load();
    loadConfig();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, [load, loadConfig]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = mainRef.current.scrollHeight;
    }
  }, [entries]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(""), 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleApply = () => load();

  const handleClear = () => {
    setService("");
    setLevel("");
    setGrep("");
    setLines(100);
    load();
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const errors = entries.filter((e) => e.level === "error").length;
  const warnings = entries.filter((e) => e.level === "warn").length;
  const infos = entries.filter((e) => e.level === "info").length;
  const debugs = entries.filter((e) => e.level === "debug").length;

  return (
    <div style={styles.container}>
      <FiltersBar
        service={service}
        level={level}
        grep={grep}
        lines={lines}
        paused={paused}
        onServiceChange={setService}
        onLevelChange={setLevel}
        onGrepChange={setGrep}
        onLinesChange={setLines}
        onApply={handleApply}
        onClear={handleClear}
        onTogglePause={() => setPaused((p) => !p)}
      />
      <ServicesBar config={config} />
      <div style={styles.statsBar}>
        <StatsBar total={entries.length} errors={errors} warnings={warnings} infos={infos} debugs={debugs} />
        {loading && <span style={styles.loading}>Actualizando...</span>}
      </div>
      <CopyBar entries={entries} selectedIds={selectedIds} onFeedback={setFeedback} />
      {feedback && <div style={styles.feedback}>{feedback}</div>}
      <div ref={mainRef} style={styles.scrollArea}>
        <LogTable
          entries={entries}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#0d1117",
    color: "#c9d1d9",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
  },
  statsBar: {
    background: "#161b22",
    borderBottom: "1px solid #30363d",
    padding: "6px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
  },
  loading: {
    fontSize: 11,
    color: "#8b949e",
    marginLeft: "auto",
  },
  feedback: {
    background: "#1f6feb",
    color: "#fff",
    padding: "4px 20px",
    fontSize: 11,
    textAlign: "center",
  },
};
