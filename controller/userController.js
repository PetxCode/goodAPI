const userModel = require("../model/userModel");
const verifiedModel = require("../model/verifiedModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const cloudinary = require("../utils/cloudinary");
// const transporter = require("../utils/email");
const jwt = require("jsonwebtoken");

const nodemailer = require("nodemailer");
// process.env.SERVICE process.env.USER process.env.PASS

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "ajmarketplace52@gmail.com",
		pass: "ajmarketplace",
	},
});

const getUsers = async (req, res) => {
	try {
		const user = await userModel.find();
		res.status(200).json({
			message: "success",
			data: user,
		});
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const getUser = async (req, res) => {
	try {
		const user = await userModel.findById(req.params.id);

		res.status(200).json({
			message: "success",
			data: user,
		});
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const deleteUser = async (req, res) => {
	try {
		await userModel.findByIdAndDelete(req.params.id);

		res.status(200).json({
			message: "deleted",
		});
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const updateUser = async (req, res) => {
	try {
		const { email } = req.body;

		const checkUser = await userModel.findById(req.params.id);

		if (checkUser) {
			await cloudinary.uploader.destroy(checkUser.avatarID);
			const image = await cloudinary.uploader.upload(req.file.path);

			const user = await userModel.findByIdAndUpdate(
				req.params.id,
				{
					email,
					avatar: image.secure_url,
					avatarID: image.public_id,
				},
				{ new: true }
			);

			res.status(200).json({
				message: "success",
				data: user,
			});
		}
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const createUser = async (req, res) => {
	try {
		const { userName, email, password } = req.body;

		const salt = await bcrypt.genSalt(10);
		const hashed = await bcrypt.hash(password, salt);

		const image = await cloudinary.uploader.upload(req.file.path);

		const user = await userModel.create({
			userName,
			email,
			password: hashed,
			avatar: image.secure_url,
			avatarID: image.public_id,
		});

		const myKey = crypto.randomBytes(32).toString("hex");
		const token = jwt.sign({ myKey }, process.env.SECRET, {
			expiresIn: process.env.TIME,
		});

		await verifiedModel.create({
			userID: user._id,
			verifiedToken: token,
		});

		const mailOptions = {
			from: "info@test.com",
			to: email,
			subject: "Verify your Email",
			html: `<h3>
            Thanks for considering our platform, to finish up your registration,
            please use this <a
            href="http://localhost:3021/api/user/${user._id}/${token}"
            >Link</a> to verify and finish up your registration!
            </h3>`,
		};

		transporter.sendMail(mailOptions, (err, info) => {
			if (err) {
				console.log(err);
			} else {
				console.log("Email has been sent", info.response);
			}
		});

		res.status(201).json({
			message: "success: Please check your Email for Verification",
		});
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const verifiedUser = async (req, res) => {
	try {
		const user = await userModel.findById(req.params.id);

		if (user) {
			await userModel.findByIdAndUpdate(
				req.params.id,
				{
					verified: true,
				},
				{ new: true }
			);

			await verifiedModel.findByIdAndUpdate(
				user._id,
				{
					userID: user._id,
					verifiedToken: "",
				},
				{ new: true }
			);

			res.status(200).json({
				message: "success: Registeration completed ",
			});
		} else {
			res.status(404).json({ message: "invalid User" });
		}
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const signUser = async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await userModel.findOne({ email });

		if (user) {
			const checkPassword = await bcrypt.compare(password, user.password);
			if (checkPassword) {
				if (user.verified) {
					const token = jwt.sign({ _id: user._id }, process.env.SECRET, {
						expiresIn: process.env.TIME,
					});
					const { password, ...info } = user._doc;
					res.status(200).json({
						message: "welcome back",
						data: { token, ...info },
					});
				} else {
					const myKey = crypto.randomBytes(32).toString("hex");
					const token = jwt.sign({ myKey }, process.env.SECRET, {
						expiresIn: process.env.TIME,
					});

					await verifiedModel.create({
						userID: user._id,
						verifiedToken: token,
					});

					const mailOptions = {
						from: "info@test.com",
						to: email,
						subject: "Verify your Email",
						html: `<h3>
            Thanks for considering our platform, to finish up your registration,
            please use this <a
            href="http://localhost:3021/api/user/${user._id}/${token}"
            >Link</a> to verify and finish up your registration!
            </h3>`,
					};

					transporter.sendMail(mailOptions, (err, info) => {
						if (err) {
							console.log(err);
						} else {
							console.log("Email has been sent", info.response);
						}
					});

					res.status(201).json({
						message: "fail to sign in: Please verify your Email to sign in",
					});
				}
			} else {
				res.status(404).json({ message: "password not correct" });
			}
		} else {
			res.status(404).json({ message: "email not correct" });
		}
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const forgotUserPassword = async (req, res) => {
	try {
		const { email } = req.body;

		const user = await userModel.findOne({ email });
		if (user) {
			if (user.verified) {
				const myKey = crypto.randomBytes(32).toString("hex");
				const token = jwt.sign({ myKey }, process.env.SECRET, {
					expiresIn: process.env.TIME,
				});

				const checkUpdate = await userModel.findByIdAndUpdate(
					user._id,
					{
						_id: user._id,
						resetToken: token,
					},
					{ new: true }
				);
				console.log(checkUpdate, user);
				const mailOptions = {
					from: "info@test.com",
					to: email,
					subject: "Verify your Email",
					html: `<h3>
            Thanks for considering our platform, to finish up your registration,
            please use this <a
            href="http://localhost:3021/api/user/reset/${user._id}/${token}"
            >Reset Link</a> to complete the Password reset request!
            </h3>`,
				};

				transporter.sendMail(mailOptions, (err, info) => {
					if (err) {
						console.log(err);
					} else {
						console.log("Email has been sent", info.response);
					}
				});
				res.status(404).json({
					message: "Check your email to complete the Password reset request!",
				});
			} else {
				res.status(404).json({
					message:
						"You don't have access for this, why not try signin up first!",
				});
			}
		} else {
			res.status(404).json({ message: "This is email isn't correct" });
		}
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const resetPassword = async (req, res) => {
	try {
		const { password } = req.body;

		const user = await userModel.findById(req.params.id);

		if (user) {
			if (user.resetToken === req.params.token) {
				if (user.resetToken !== "") {
					const salt = await bcrypt.genSalt(10);
					const hashed = await bcrypt.hash(password, salt);

					await userModel.findByIdAndUpdate(
						user._id,
						{ password: hashed, resetToken: "" },
						{ new: true }
					);

					res.status(200).json({
						message: "Password has been changed; You can sign in",
					});
				} else {
					res.status(404).json({ message: "failed: you have an Empty token" });
				}
			} else {
				res.status(404).json({ message: "failed: check you token again" });
			}
		} else {
			res
				.status(404)
				.json({ message: "failed: sorry you can't carry out this" });
		}
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

const queryUser = async (req, res) => {
	try {
		const { search } = req.body;
		const keyword = req.query.search
			? {
					$or: [
						{ userName: { $regex: req.query.search, $options: "i" } },
						{ email: { $regex: req.query.search, $options: "i" } },
					],
			  }
			: null;

		const user = await userModel.find(keyword);

		res.status(200).json({ message: "search result found", data: user });
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};

// const deleteUser = async (req, res) => {
// 	try {
// 		await userModel.findByIdAndDelete(req.params.id);

// 		res.status(200).json({
// 			message: "deleted",
// 		});
// 	} catch (err) {
// 		res.status(404).json({
// 			message: err.message,
// 		});
// 	}
// };

module.exports = {
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
};
