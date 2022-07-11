import express from "express";
import fetch from "node-fetch";
import { port } from "./config.js";

// TODO: save to disk
const db = {
  users: {}, // userId -> {latitude, longitude, avatar, ...}
};

const app = express();

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/", express.static("static"));

app.post("/pos", async (req, res) => {
  // TODO: Check authorization, make request to discord, check they're in atlas

  const resp = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: req.headers.authorization },
  });
  if (resp.status != 200) {
    return res
      .status(resp.status)
      .send("Authentication with discord failed, bad token?");
  }
  const userInfo = await resp.json();
  db.users[userInfo.id] = { ...req.body, ...userInfo };
  console.log(db.users);
  res.send({ status: "ok" });
});

app.listen(port, () =>
  console.log(`App listening at http://localhost:${port}`)
);
