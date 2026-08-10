import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studyecartRouter from "./studyecart";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studyecartRouter);

export default router;
