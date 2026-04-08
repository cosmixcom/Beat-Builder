import { Router, type IRouter } from "express";
import healthRouter from "./health";
import beatsRouter from "./beats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(beatsRouter);

export default router;
