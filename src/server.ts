import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import routes from "./routes/routes";
import { verifyToken } from "./middlewares/autho";
import { Request, Response, NextFunction } from 'express';
import os from "os";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9090;

app.use(cors());
app.use(bodyParser.json());

// app.use("/api", verifyToken, routes); อันนี้รอใช้ตอนเดียร์เริ่มทำ Autho
app.use("/api", routes);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Welcome to the LinkLian API", hostname: os.hostname()});
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(400).json({ success: false, message: err.message });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${os.hostname()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
