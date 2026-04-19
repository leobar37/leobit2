/// <reference types="vite/client" />

// Declare that .sql files return a string when imported with ?raw
declare module "*.sql?raw" {
  const content: string;
  export default content;
}

declare module "*.sql" {
  const content: string;
  export default content;
}
