import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import routes from "./routes/routes";
import { verifyToken } from "./middlewares/autho";
import { Request, Response, NextFunction } from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9090;

app.use(cors());
app.use(bodyParser.json());

app.use("/api", verifyToken, routes);

app.get("/", verifyToken, (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Welcome to the LinkLian API" });
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(400).json({ success: false, message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
