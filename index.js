const express = require("express");
const app = express();
const dotenv = require('dotenv')
const cors = require("cors");

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});