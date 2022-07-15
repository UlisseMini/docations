import express from "express";
import fetch from "node-fetch";
import { port, guildID } from "./config.js";
import { writeFile, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

let db = {
  members: {}, // userId -> {latitude, longitude, avatar, ...}
  cache: {}, // auth -> userId
};
const DB_PATH = join(dirname(fileURLToPath(import.meta.url)), "db.json");
try {
  db = JSON.parse(await readFile(DB_PATH, { encoding: "utf8" }));
  if (db.users) {
    // migrate from previous schema (this is messy and duplicates lat/lon, who cares)
    db.members = Object.fromEntries(
      Object.entries(db.users).map(([id, u]) => [
        id,
        { latitude: u.latitude, longitude: u.longitude, user: u },
      ])
    );
    delete db.users;
    delete db.guilds;
  }
  if (!db.cache) db.cache = {};
} catch (e) {
  console.error(`Failed to read ${DB_PATH}: ${e}`);
}

const app = express();

app.use(express.json());

app.use("/", express.static("static"));

async function authenticate(req) {
  const auth = req.headers.authorization;
  let id;
  if ((id = db.cache[auth])) {
    // TODO: Check db.members[id].date and remove if old
    return db.members[id];
  }

  const resp = await fetch(
    `https://discord.com/api/users/@me/guilds/${guildID}/member`,
    {
      headers: { authorization: auth },
    }
  );
  if (resp.status != 200) {
    throw new Error(`${resp.status}: ${await resp.text()}`);
  }
  const guildMember = await resp.json();
  db.cache[auth] = guildMember.user.id;
  return guildMember;
}

app.get("/pos", async (req, res) => {
  const m = await authenticate(req, res);
  return res.send({ status: "ok", members: db.members, myId: m.user.id });
});

app.post("/pos", async (req, res) => {
  const guildMember = await authenticate(req, res);

  // make it slightly harder to break... only slightly
  if (typeof req.body.latitude !== "number")
    return res.status(400).send("bad latitude");
  if (typeof req.body.longitude !== "number")
    return res.status(400).send("bad longitude");

  db.members[guildMember.user.id] = {
    ...guildMember,
    // make sure these come after so they update guildMember!
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    date: Date.now(),
  };
  await writeFile(DB_PATH, JSON.stringify(db)); // save db

  res.send({ status: "ok", members: db.members });
});

app.listen(port, () =>
  console.log(`App listening at http://localhost:${port}`)
);
