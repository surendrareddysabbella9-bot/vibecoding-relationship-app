const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
// const User = require('../models/User');

// @route   GET api/messages/:room
// @desc    Get chat history
// @access  Private
router.get('/:room', auth, async (req, res) => {
    try {
        // Verify user is part of this room
        // The room is expected to be "id1_id2" (sorted)
        const roomIds = req.params.room.split('_');
        if (!roomIds.includes(req.user.id)) {
            return res.status(401).json({ msg: 'Not authorized for this chat room' });
        }

        const messages = await Message.find({ room: req.params.room })
            .sort({ timestamp: 1 })
            .populate('sender', 'name');

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
