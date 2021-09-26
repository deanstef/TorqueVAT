var mongoose = require('mongoose');

var algoAssetSchema = mongoose.Schema({
    id: Number,
    type: String,
    decimals: Number
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('AlgoAsset', algoAssetSchema);
