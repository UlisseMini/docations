import express from "express";
import fetch from "node-fetch";
import { port, guildID } from "./config.js";
import { writeFile, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

let db = {
  members: {}, // userId -> {latitude, longitude, avatar, ...}
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
} catch (e) {
  console.error(`Failed to read ${DB_PATH}: ${e}`);
}

const app = express();

app.use(express.json());

app.use("/", express.static("static"));

app.post("/pos", async (req, res) => {
  // make it slightly harder to break... only slightly
  if (typeof req.body.latitude !== "number")
    res.status(400).send("bad latitude");
  if (typeof req.body.longitude !== "number")
    res.status(400).send("bad longitude");

  try {
    const guildMemberResp = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildID}/member`,
      {
        headers: { authorization: req.headers.authorization },
      }
    );
    if (guildMemberResp.status != 200) {
      return res.status(guildsResp.status).send(await guildsResp.json());
    }
    const guildMember = await guildMemberResp.json();

    db.members[guildMember.user.id] = {
      ...req.body,
      ...guildMember,
      date: Date.now(),
    };
    await writeFile(DB_PATH, JSON.stringify(db)); // save db

    res.send({ status: "ok", members: db.members });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "err" });
  }
});

app.listen(port, () =>
  console.log(`App listening at http://localhost:${port}`)
);
