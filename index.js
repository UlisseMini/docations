const express = require("express");
const { port } = require("./config.json");

const app = express();

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/", express.static("static"));

app.post("/login", (req, res) => {
  console.log(req);
  res.json(req.json());
});

app.listen(port, () =>
  console.log(`App listening at http://localhost:${port}`)
);
