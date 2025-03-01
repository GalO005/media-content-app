import express from "express";
import mediaRoutes from "./media.routes";
const router = express.Router();

router.use("/media", mediaRoutes);

export default router;