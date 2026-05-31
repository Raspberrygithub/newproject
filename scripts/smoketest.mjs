// End-to-end smoke test against a running server. Exits non-zero on any failed
// assertion. Designed so correctness is conveyed by exit code, not stdout.
const BASE = process.env.BASE || "http://localhost:3100";
let failures = 0;
function check(name, cond) {
  if (!cond) {
    failures++;
    console.error("FAIL:", name);
  } else {
    console.log("ok:", name);
  }
}
async function j(path, init) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  // stats consistency
  const stats = await j("/api/stats");
  check("stats 200", stats.status === 200);
  const s = stats.body;
  check(
    "stats partition (total === new+learning+review)",
    s.total === s.newCards + s.learning + s.review
  );

  // create a card
  const created = await j("/api/cards", {
    method: "POST",
    body: JSON.stringify({ front: "TEST_FRONT_XYZ", back: "TEST_BACK", tags: ["t"] }),
  });
  check("create 201", created.status === 201);
  const id = created.body.cards?.[0]?.id;
  check("create returned id", Boolean(id));

  // it should appear in the due queue (new cards are due immediately)
  const review = await j("/api/review");
  check("review 200", review.status === 200);
  const inQueue = review.body.queue?.find((c) => c.id === id);
  check("new card is in due queue", Boolean(inQueue));
  check(
    "queue card has 4 grade previews",
    inQueue && Array.isArray(inQueue.previews) && inQueue.previews.length === 4
  );

  // grade it "good" -> should graduate to ~1 day (1440 min)
  const graded = await j("/api/review", {
    method: "POST",
    body: JSON.stringify({ cardId: id, grade: "good" }),
  });
  check("grade good 200", graded.status === 200);
  check("good -> 1 day interval", graded.body.intervalMin === 1440);

  // after grading, card should no longer be due now
  const review2 = await j("/api/review");
  check("graded card left the due queue", !review2.body.queue?.find((c) => c.id === id));

  // custom delay (5 min) on a fresh card
  const c2 = await j("/api/cards", {
    method: "POST",
    body: JSON.stringify({ front: "TEST_DELAY", back: "x" }),
  });
  const id2 = c2.body.cards?.[0]?.id;
  const delayed = await j("/api/review", {
    method: "POST",
    body: JSON.stringify({ cardId: id2, delayMinutes: 5 }),
  });
  check("custom 5-min delay applied", delayed.body.intervalMin === 5);

  // search
  const search = await j("/api/cards?q=TEST_FRONT_XYZ");
  check("search finds the card", search.body.cards?.some((c) => c.id === id));

  // cleanup
  await j(`/api/cards/${id}`, { method: "DELETE" });
  await j(`/api/cards/${id2}`, { method: "DELETE" });
  const afterDel = await j("/api/cards?q=TEST_FRONT_XYZ");
  check("card deleted", !afterDel.body.cards?.some((c) => c.id === id));

  console.log(failures === 0 ? "ALL_PASS" : `FAILURES=${failures}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("THREW:", e);
  process.exit(2);
});
