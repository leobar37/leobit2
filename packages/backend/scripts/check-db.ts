const connectionString = process.env.DATABASE_URL!;

async function checkData() {
  const postgres = (await import("postgres")).default;
  const client = postgres(connectionString);
  
  try {
    const tables = await client`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables:", tables.map(t => t.table_name));
    
    const users = await client`SELECT * FROM "user" LIMIT 1`;
    console.log("Users:", users);
  } finally {
    await client.end();
  }
}

checkData().catch(console.error);
