import { createAppServer } from "./app.js";
const server = await createAppServer({
  port: Number(process.env.PORT || 47832),
  dev: process.argv.includes("--dev"),
});
console.log(`NexVNC disponible en ${server.url}`);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
