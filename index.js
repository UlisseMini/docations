import express from "express";
import fetch from "node-fetch";
import { port, guildID } from "./config.js";
import { writeFile, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

let db = {
  users: {}, // userId -> {latitude, longitude, avatar, ...}
  guilds: {}, // userId -> guilds
};
const DB_PATH = join(dirname(fileURLToPath(import.meta.url)), "db.json");
try {
  db = JSON.parse(await readFile(DB_PATH, { encoding: "utf8" }));
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
    // Authentication: Check they're in guildID
    const guildsResp = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { authorization: req.headers.authorization },
    });
    if (guildsResp.status != 200) {
      return res.status(guildsResp.status).send(await guildsResp.json());
    }
    const guilds = await guildsResp.json();
    if (!guilds.map((g) => g.id).includes(guildID)) {
      return res
        .status(401)
        .send({ status: "err", msg: "Not in proper guild" });
    }

    const userResp = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: req.headers.authorization },
    });
    if (userResp.status != 200) {
      return res.status(userResp.status).send(await userResp.json());
    }
    const userInfo = await userResp.json();

    db.users[userInfo.id] = { ...req.body, ...userInfo, date: Date.now() };
    db.guilds[userInfo.id] = guilds;
    await writeFile(DB_PATH, JSON.stringify(db)); // save db

    res.send({ status: "ok", users: db.users });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "err" });
  }
});

app.listen(port, () =>
  console.log(`App listening at http://localhost:${port}`)
);
