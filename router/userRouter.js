const express = require("express");
const router = express.Router();
const upload = require("../utils/multer");
const {
	getUsers,
	createUser,
	deleteUser,
	getUser,
	updateUser,
	verifiedUser,
	signUser,
	forgotUserPassword,
	resetPassword,
	queryUser,
} = require("../controller/userController");

router.route("/").get(getUsers);
router.route("/create").post(upload, createUser);

router.route("/signin").post(signUser);
router.route("/forgot_password").post(forgotUserPassword);
router.route("/reset/:id/:token").post(resetPassword);
router.route("/query").get(queryUser);

router.route("/:id/:token").get(verifiedUser);

router.route("/:id").get(getUser).patch(upload, updateUser).delete(deleteUser);

module.exports = router;
