import express from "express";
import dotenv from "dotenv";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import routes from "./routes/routes"
import { setupWebSocket } from './ws/socket';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 7070;

setupWebSocket(server);

app.use(cors());
app.use(bodyParser.json());
app.use(express.json()); 

app.use("/api", routes);


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

