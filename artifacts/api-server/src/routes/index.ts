import { Router, type IRouter } from "express";
import healthRouter from "./health";
import entriesRouter from "./entries";
import photosRouter from "./photos";
import tagsRouter from "./tags";
import statsRouter from "./stats";
import storageRouter from "./storage";
import aiRouter from "./ai";
import socialRouter from "./social";
import payRouter from "./pay";
import geocodeRouter from "./geocode";
import weatherRouter from "./weather";
import digestRouter from "./digest";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/entries", entriesRouter);
router.use("/photos", photosRouter);
router.use("/tags", tagsRouter);
router.use("/stats", statsRouter);
router.use(storageRouter);
router.use("/ai", aiRouter);
router.use(socialRouter);
router.use("/pay", payRouter);
router.use(geocodeRouter);
router.use(weatherRouter);
router.use(digestRouter);

export default router;
