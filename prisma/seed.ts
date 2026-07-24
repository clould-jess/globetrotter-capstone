import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const destinations = [
    { name: "Yaoundé", country: "Cameroon", description: "Hilly capital city.", tags: ["city", "culture"] },
    { name: "Douala", country: "Cameroon", description: "Coastal economic hub.", tags: ["city", "coastal"] },
    { name: "Kribi", country: "Cameroon", description: "Beach town with waterfalls.", tags: ["beach", "nature"] },
    { name: "Kyoto", country: "Japan", description: "Historic temples and gardens.", tags: ["culture", "history"] },
    { name: "Lisbon", country: "Portugal", description: "Coastal European capital.", tags: ["city", "coastal"] },
  ];

  for (const d of destinations) {
    await prisma.destination.upsert({
      where: { id: d.name.toLowerCase() },
      update: {},
      create: { id: d.name.toLowerCase(), ...d, tags: d.tags.join(",") },
    });
  }

  console.log(`Seeded ${destinations.length} destinations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
