// Optional seed: a few sample cards so the app isn't empty on first run.
// Run with:  npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deck = await prisma.deck.create({ data: { name: "My Deck" } });
  const samples = [
    { front: "What is spaced repetition?", back: "A learning technique where reviews are spaced at increasing intervals to exploit the spacing effect and strengthen long-term memory.", tags: "meta" },
    { front: "Mitochondria", back: "The organelle that produces most of a cell's ATP — its 'powerhouse'.", tags: "biology" },
    { front: "Capital of Australia", back: "Canberra (not Sydney).", tags: "geography" },
  ];
  for (const s of samples) {
    await prisma.card.create({ data: { ...s, deckId: deck.id } });
  }
  console.log(`Seeded ${samples.length} cards.`);
}

main().finally(() => prisma.$disconnect());
