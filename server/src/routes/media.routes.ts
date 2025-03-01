import express from "express";
import { MediaController } from "../controllers/media.controller";

const router = express.Router();
const mediaController = new MediaController();

router.get("/search", mediaController.search);

router.post('/pit', mediaController.createPit);
router.delete('/pit/:id', mediaController.deletePit);

export default router;