var mongoose = require('mongoose');

var vatRefoundSchema = mongoose.Schema({
    history: [
        {
            time: Number,
            amount: Number,
            _id: false
        }
    ],
    address: String
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('vatRefound', vatRefoundSchema);
