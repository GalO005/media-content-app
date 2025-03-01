import express from "express";
import cors from 'cors';
import appRoutes from "./routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1", appRoutes);

export default app;