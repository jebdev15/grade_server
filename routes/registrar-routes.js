const express = require("express");
const router = express.Router();
const {
    getData,
    updateData
} = require("../controllers/registrarActivityController");

router.get('/getData', getData)
router.post('/updateData', updateData)

module.exports = router