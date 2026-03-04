import { app } from "./app";

// Start the server
app.listen({
  port: Number(process.env.PORT) || 3000,
  hostname: "0.0.0.0",
});

console.log(
  `🦊 Avileo backend running at http://${app.server?.hostname}:${app.server?.port}`
);

// Export app type for Eden Treaty client
export type { App } from "./app";
