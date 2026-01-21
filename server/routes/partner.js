const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/partner/connect
// @desc    Connect with partner using code
// @access  Private
router.post('/connect', auth, async (req, res) => {
    const { partnerCode } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (user.partnerId) {
            return res.status(400).json({ msg: 'You are already connected to a partner' });
        }

        const partner = await User.findOne({ partnerLinkCode: partnerCode });

        if (!partner) {
            return res.status(404).json({ msg: 'Partner not found' });
        }

        if (partner.id === user.id) {
            return res.status(400).json({ msg: 'You cannot connect with yourself' });
        }

        if (partner.partnerId) {
            return res.status(400).json({ msg: 'Partner is already connected to someone else' });
        }

        // Link both users
        user.partnerId = partner.id;
        partner.partnerId = user.id;

        await user.save();
        await partner.save();

        res.json({ msg: 'Partner connected successfully', partnerName: partner.name });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/partner/status
// @desc    Get partner status and mood
// @access  Private
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.partnerId) {
            return res.json({ connected: false });
        }

        const partner = await User.findById(user.partnerId);
        if (!partner) {
            // Data inconsistency cleanup
            user.partnerId = null;
            await user.save();
            return res.json({ connected: false });
        }

        // Return partner info respecting privacy
        // moodPrivacy: true = Shared, false = Private
        res.json({
            connected: true,
            name: partner.name,
            mood: partner.moodPrivacy ? partner.currentMood : null,
            intensity: partner.moodPrivacy ? partner.taskIntensity : null,
            lastMoodUpdate: partner.lastMoodUpdate
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
