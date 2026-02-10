import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Avileo" },
    { name: "description", content: "Welcome to Avileo" },
  ];
}

export default function Index() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Welcome to Avileo</h1>
      <p>React Router v7 app is running!</p>
    </div>
  );
}
