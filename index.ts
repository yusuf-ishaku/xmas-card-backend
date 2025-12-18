import express from "express";
import messagesRouter from "./routers/messages";

const app = express();
const port = process.env.PORT ?? 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/messages", messagesRouter);

app.listen(+port, "0.0.0.0", () => {
  console.info(`App listening on port ${port}`);
});
