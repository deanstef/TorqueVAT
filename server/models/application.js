var mongoose = require('mongoose');

var ApplicationSchema = mongoose.Schema({
    amount: Number,
    tokenId: Number,
    type: String,
    completed: {
        type: Boolean,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('Application', ApplicationSchema);
