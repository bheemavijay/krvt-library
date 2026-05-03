const express = require("express");

const { importController } = require("../controllers/importController");

const router = express.Router();

router.post("/", importController);

module.exports = router;
