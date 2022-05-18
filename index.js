const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
require("./utils/dbConnect");

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use("/api/user", require("./router/userRouter"));

app.listen(port, () => {
	console.log("server is now connected");
});
