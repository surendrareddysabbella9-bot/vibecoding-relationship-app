const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    partnerLinkCode: {
        type: String,
        unique: true
    },
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    onboardingData: {
        communicationStyle: String,
        loveLanguage: String,
        interests: [String]
    },
    currentMood: {
        type: String,
        enum: ['Happy', 'Stressed', 'Tired', 'Romantic', 'Chill', ''],
        default: ''
    },
    lastMoodUpdate: {
        type: Date
    },
    taskIntensity: {
        type: Number,
        default: 2 // 1: Chill, 2: Balanced, 3: Deep
    },
    moodPrivacy: {
        type: Boolean,
        default: true // true = shared, false = private
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

module.exports = mongoose.model('User', UserSchema);
