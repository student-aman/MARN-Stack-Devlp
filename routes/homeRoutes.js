// routes/homeRoutes.js

const express = require('express');
const router = express.Router(); // Express router instance banaya

// homeControllers ko import karein
// (Sure karein ki 'controllers' folder 'routes' folder ke parallel hai)
const homeController = require('../controllers/homeControllers');

// Home page ke liye GET request define karein
// Jab koi user '/' URL par request karega,
// toh 'homeController.getHomePage' function run hoga.
router.get('/', homeController.getHomePage);

// Is router ko export karein taaki 'app.js' isse use kar sake
module.exports = router;