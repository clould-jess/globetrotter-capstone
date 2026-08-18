import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ships six curated Cameroon destinations with credits", async () => {
  const source = await readProjectFile("lib/destinations.ts");
  const slugs = [
    "mont-cameroun",
    "kribi",
    "ekom-nkam",
    "rhumsiki",
    "foumban",
    "yaounde",
  ];

  for (const slug of slugs) {
    assert.match(source, new RegExp(`slug: ["']${slug}["']`));
  }
  assert.equal((source.match(/license: ["']/g) ?? []).length, slugs.length);
  assert.equal((source.match(/imagePage: ["']/g) ?? []).length, slugs.length);
});

test("phase two keeps services and databases separated", async () => {
  const compose = await readProjectFile("backend/docker-compose.yml");

  for (const service of [
    "user-service",
    "itinerary-service",
    "discovery-service",
    "user-db",
    "itinerary-db",
    "discovery-db",
    "rabbitmq",
  ]) {
    assert.match(compose, new RegExp(`^  ${service}:`, "m"));
  }

  assert.match(compose, /postgresql:\/\/cameroon_user:/);
  assert.match(compose, /postgresql:\/\/cameroon_itinerary:/);
  assert.match(compose, /postgresql:\/\/cameroon_discovery:/);
});

test("phase two exposes CRUD, discovery and publishing contracts", async () => {
  const [users, itineraries, discovery] = await Promise.all([
    readProjectFile("backend/services/user-service/app/main.py"),
    readProjectFile("backend/services/itinerary-service/app/main.py"),
    readProjectFile("backend/services/discovery-service/app/main.py"),
  ]);

  assert.match(users, /@app\.post\("\/users"/);
  assert.match(users, /Administrator role required/);
  assert.match(itineraries, /@app\.patch\("\/itineraries\/\{itinerary_id\}"/);
  assert.match(itineraries, /itinerary\.updated/);
  assert.match(discovery, /@app\.get\("\/recommendations"/);
  assert.match(discovery, /\/admin\/destinations\/\{slug\}\/publish/);
});

test("ships a filterable tourism guide and interactive map", async () => {
  const [places, explorer, guide, header] = await Promise.all([
    readProjectFile("lib/tourism.ts"),
    readProjectFile("components/tourism-explorer.tsx"),
    readProjectFile("app/guide/page.tsx"),
    readProjectFile("components/site-header.tsx"),
  ]);

  assert.ok((places.match(/^\s+id: ["']/gm) ?? []).length >= 15);
  assert.match(places, /type: ["']hotel["']/);
  assert.match(places, /type: ["']restaurant["']/);
  assert.match(places, /type: ["']activity["']/);
  assert.match(explorer, /openstreetmap\.org\/search/);
  assert.match(explorer, /setMapZoom/);
  assert.match(explorer, /setType/);
  assert.match(explorer, /setCity/);
  assert.match(guide, /<TourismExplorer/);
  assert.match(header, /href=["']\/guide["']/);
});

test("uses distinct credited tourism imagery", async () => {
  const places = await readProjectFile("lib/tourism.ts");
  const images = [...places.matchAll(/image: ["'](\/places\/[^"']+)["']/g)].map((match) => match[1]);

  assert.equal(images.length, 16);
  assert.equal(new Set(images).size, images.length);
  assert.equal((places.match(/imageAlt:/g) ?? []).length, 17);
  assert.equal((places.match(/imagePage:/g) ?? []).length, 17);
  assert.equal((places.match(/imageCredit:/g) ?? []).length, 17);
  assert.equal((places.match(/imageLicense:/g) ?? []).length, 17);
  assert.match(places, /imageKind: ["']place["']/);
  assert.match(places, /imageKind: ["']context["']/);
});
