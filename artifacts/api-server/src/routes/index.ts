import { Router, type IRouter } from "express";
import healthRouter from "./health";
import entriesRouter from "./entries";
import photosRouter from "./photos";
import tagsRouter from "./tags";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/entries", entriesRouter);
router.use("/photos", photosRouter);
router.use("/tags", tagsRouter);
router.use("/stats", statsRouter);

export default router;
