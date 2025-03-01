import express from "express";
import appRoutes from "./routes";

const app = express();

app.use(express.json());
app.use("/api/v1", appRoutes);

export default app;