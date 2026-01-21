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
    responses: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
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
    },
    feedback: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model('Task', TaskSchema);
