const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    coupleIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'General'
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    aiGenerated: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Task', TaskSchema);
