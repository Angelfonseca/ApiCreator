import generatorController from "../controllers/generator.controller";
import generatorJSController from "../controllers/generatorJS.controller";
import generatorPGJSController from "../controllers/generatorPostgresJS.controller";
import generatorPGTSController from "../controllers/generatorPostgresTs.controller";
import aiController from "../services/ai.service";
import { Router } from "express";

const router = Router();

router.post('/generate', generatorController.createProject);
router.post('/generatejs', generatorJSController.createJSProject);
router.post('/generatepgjs', generatorPGJSController.createPgProject);
router.post('/generatepgts', generatorPGTSController.createPgTSProject);
router.post('/ai', aiController.controller);

export default router;