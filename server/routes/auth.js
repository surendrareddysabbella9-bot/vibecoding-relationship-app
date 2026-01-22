const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
// Email integration removed for demo mode

router.post('/check-email', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        res.json({ exists: !!user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
    '/register',
    [
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            // ... (rest of register logic remains same, but we need to ensure we don't duplicate code if replacing large block)
            // Ideally we only replace the validation part if possible, or the whole route handler wrapper
            let user = await User.findOne({ email });

            if (user) {
                return res.status(400).json({ msg: 'User already exists' });
            }

            const partnerLinkCode = crypto.randomBytes(4).toString('hex');

            user = new User({
                name,
                email,
                password,
                partnerLinkCode
            });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();

            const payload = {
                user: {
                    id: user.id
                }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: 360000 },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    async (req, res) => {
        const { email, password } = req.body;

        try {
            let user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const payload = {
                user: {
                    id: user.id
                }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: 360000 },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

// @route   PUT api/auth/onboarding
// @desc    Update user onboarding data
// @access  Private
router.put('/onboarding', auth, async (req, res) => {
    const { communicationStyle, loveLanguage, interests } = req.body;

    // Build onboarding object
    const onboardingFields = {};
    if (communicationStyle) onboardingFields.communicationStyle = communicationStyle;
    if (loveLanguage) onboardingFields.loveLanguage = loveLanguage;
    if (interests) onboardingFields.interests = interests;

    try {
        let user = await User.findById(req.user.id);
        if (user) {
            user.onboardingData = onboardingFields;
            await user.save();
            return res.json(user);
        }
        res.status(404).json({ msg: 'User not found' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/mood
// @desc    Update user current mood
// @access  Private
router.put('/mood', auth, async (req, res) => {
    const { mood, intensity, privacy } = req.body;

    try {
        let user = await User.findById(req.user.id);
        if (user) {
            if (mood) user.currentMood = mood;
            if (intensity) user.taskIntensity = intensity;
            if (privacy !== undefined) user.moodPrivacy = privacy;

            user.lastMoodUpdate = Date.now();
            await user.save();

            // Emit mood update to partner via Socket.io
            if (user.partnerId) {
                const io = req.app.get('io');
                const coupleRoom = [user._id.toString(), user.partnerId.toString()].sort().join('_');
                const eventData = {
                    userId: user._id,
                    mood: user.moodPrivacy ? user.currentMood : null, // Respect privacy
                    intensity: user.moodPrivacy ? user.taskIntensity : null, // Respect privacy
                    privacy: user.moodPrivacy,
                    timestamp: user.lastMoodUpdate
                };
                console.log('📡 Emitting partner_mood_updated to room:', coupleRoom, 'data:', eventData);
                io.to(coupleRoom).emit('partner_mood_updated', eventData);
            }

            return res.json(user);
        }
        res.status(404).json({ msg: 'User not found' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/user
// @desc    Get logged in user
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/forgot-password
// @desc    Forgot Password - Generate Token and Send Email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User with this email does not exist' });
        }

        // Get Reset Token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

        await user.save();

        // Create reset url
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        // Demo mode: Return reset link directly (no email service needed for hackathon)
        console.log('Password reset link generated for:', email);
        res.status(200).json({
            success: true,
            msg: 'Reset link generated!',
            demoLink: resetUrl
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/reset-password/:resetToken
// @desc    Reset Password
// @access  Public
router.put('/reset-password/:resetToken', async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resetToken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid token' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ success: true, data: 'Password updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
