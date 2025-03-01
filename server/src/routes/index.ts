import express from "express";

const router = express.Router();

router.get("/test", (req, res) => {
  res.send("Initial route works!");
});

export default router;