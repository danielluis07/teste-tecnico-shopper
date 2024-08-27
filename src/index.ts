import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { genAI } from "./lib/gen-ai";
import { fileManager } from "./lib/gen-ai";

const app = new Hono();

app.get("/:customer_code/list", async (c) => {});

app.post("/upload", async (c) => {});

app.patch("/confirm", async (c) => {});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
