import generatorController from "../controllers/generator.controller";
import { Router } from "express";

const router = Router();

router.post('/generate', generatorController.createProject);

export default router;