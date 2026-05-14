import { Router } from "express";
import { createUser, deleteUser, getUser, listUsers, setUserActive, updateUser } from "../controllers/user.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/error.middleware.js";
import { mongoIdParam } from "../validators/common.validator.js";

const router = Router();

router.use(protect, authorize("admin"));
router.route("/").post(createUser).get(listUsers);
router.patch("/:id/active", mongoIdParam(), validateRequest, setUserActive);
router.route("/:id").get(mongoIdParam(), validateRequest, getUser).patch(mongoIdParam(), validateRequest, updateUser).delete(mongoIdParam(), validateRequest, deleteUser);

export default router;
