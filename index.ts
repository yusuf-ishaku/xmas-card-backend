import express from "express";
import cors from "cors";
import messagesRouter from "./routers/messages";
import authRouter from "./routers/auth";

const app = express();
const port = process.env.PORT ?? 3300;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://holigram.vercel.app",
    "https://withlove.applift.xyz",
    "https://holigram.applift.xyz"
  ]
}));
app.use("/messages", messagesRouter);
app.use("/auth", authRouter);

app.listen(+port, "0.0.0.0", () => {
  console.info(`App listening on port ${port}`);
});
