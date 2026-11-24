import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "../server.mjs";

test("triage returns manual review for model failures and rejects blank input", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const success = await fetch(`${base}/api/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Сколько стоит доставка?" }),
  });
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), {
    status: "ready",
    topic: "delivery",
    draft: "Спасибо за обращение. Уточним детали заявки.",
  });

  for (const text of ["[timeout]", "[error]", "[bad-json]", "[bad-topic]", "[empty-draft]"]) {
    const response = await fetch(`${base}/api/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    assert.equal(response.status, 200, text);
    assert.deepEqual(await response.json(), { status: "manual_review", topic: null, draft: null }, text);
  }

  for (const body of [
    "{}",
    JSON.stringify({ text: "   " }),
    JSON.stringify({ text: 42 }),
    "{",
  ]) {
    const response = await fetch(`${base}/api/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { status: "invalid_input" });
  }
});
