import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ships a credited destination collection covering Cameroon", async () => {
  const source = await readProjectFile("lib/destinations.ts");
  const slugs = [
    "mont-cameroun",
    "kribi",
    "ekom-nkam",
    "rhumsiki",
    "waza",
    "benoue",
    "tello",
    "lake-awing",
    "foumban",
    "limbe",
    "yaounde",
    "dja",
    "lobeke",
  ];

  for (const slug of slugs) {
    assert.match(source, new RegExp(`slug: ["']${slug}["']`));
  }
  assert.equal((source.match(/license: ["']/g) ?? []).length, slugs.length);
  assert.equal((source.match(/imagePage: ["']/g) ?? []).length, slugs.length);
  for (const region of ["Extrême-Nord", "Nord", "Adamaoua", "Nord-Ouest", "Ouest", "Sud-Ouest", "Littoral", "Centre", "Est", "Sud"]) {
    assert.match(source, new RegExp(region));
  }
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

test("protects accounts, destination chat and administration", async () => {
  const [accounts, community, gateway, compose, authUi, chatUi, dashboard] = await Promise.all([
    readProjectFile("backend/services/user-service/app/main_v3.py"),
    readProjectFile("backend/services/community-service/app/community.py"),
    readProjectFile("backend/gateway/nginx.conf"),
    readProjectFile("backend/docker-compose.yml"),
    readProjectFile("components/auth-provider.tsx"),
    readProjectFile("components/destination-chat.tsx"),
    readProjectFile("components/admin-dashboard.tsx"),
  ]);

  assert.match(accounts, /hashlib\.scrypt/);
  assert.match(accounts, /httponly=True/);
  assert.match(accounts, /samesite="strict"/);
  assert.match(accounts, /@app\.post\("\/auth\/register"/);
  assert.match(accounts, /@app\.get\("\/admin\/stats"/);
  assert.match(community, /destination_slug/);
  assert.match(community, /@app\.post\(/);
  assert.match(community, /@app\.delete\("\/messages\/\{message_id\}"/);
  assert.match(gateway, /auth_request \/_auth/);
  assert.match(gateway, /upstream community_service/);
  assert.match(compose, /^  community-service:/m);
  assert.match(compose, /^  community-db:/m);
  const communityService = compose.match(/^  community-service:[\s\S]*?(?=^  [a-z].*:|^volumes:)/m)?.[0] ?? "";
  assert.doesNotMatch(communityService, /ports:/);
  assert.match(authUi, /\/account\?next=/);
  assert.match(chatUi, /setInterval/);
  assert.match(dashboard, /active_users_24h/);
  assert.match(dashboard, /admin\/destinations/);
});

test("ships a filterable tourism guide and interactive map", async () => {
  const [places, explorer, guide, header] = await Promise.all([
    readProjectFile("lib/tourism.ts"),
    readProjectFile("components/tourism-explorer.tsx"),
    readProjectFile("app/guide/page.tsx"),
    readProjectFile("components/site-header.tsx"),
  ]);

  assert.ok((places.match(/^\s+id: ["']/gm) ?? []).length >= 15);
  assert.match(places, /regionalHubs\.flatMap/);
  assert.match(places, /serviceBlueprints\.map/);
  assert.match(places, /type: ["']hotel["']/);
  assert.match(places, /type: ["']motel["']/);
  assert.match(places, /type: ["']apartment["']/);
  assert.match(places, /type: ["']restaurant["']/);
  assert.match(places, /type: ["']fastfood["']/);
  assert.match(places, /type: ["']car-rental["']/);
  assert.match(places, /type: ["']activity["']/);
  assert.match(explorer, /google\.com\/maps\/dir/);
  assert.match(explorer, /RoadMap/);
  const roadMap = await readProjectFile("components/road-map.tsx");
  assert.match(roadMap, /L\.tileLayer/);
  assert.match(roadMap, /getCurrentPosition/);
  assert.match(roadMap, /maps\/route/);
  assert.match(explorer, /setType/);
  assert.match(explorer, /setCity/);
  assert.match(explorer, /setRegion/);
  assert.match(explorer, /showSuggestions/);
  assert.ok(explorer.startsWith('"use client";'));
  assert.match(explorer, /filtered\.find\(\(place\) => place\.id === selectedId\) \?\? filtered\[0\]/);
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
