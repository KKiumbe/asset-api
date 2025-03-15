// src/routes/installmentRoutes.js
const express = require('express');

const { createAsset, getAssets, getTenantAssets, getAssetById } = require('../../controller/assetContoller/assetController.js');
const verifyToken = require('../../middleware/verifyToken.js');
const router = express.Router();



// Create an installment plan
router.post('/create-asset', verifyToken,  createAsset );

router.get('/get-assets', verifyToken,  getTenantAssets );





router.get('/asset/:assetId' ,verifyToken, getAssetById );

module.exports = router;