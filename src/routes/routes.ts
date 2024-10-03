import generatorController from "../controllers/generator.controller";
import generatorJSController from "../controllers/generatorJS.controller";
import { Router } from "express";

const router = Router();

router.post('/generate', generatorController.createProject);
router.post('/generatejs', generatorJSController.createJSProject);

export default router;