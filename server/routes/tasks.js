const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Init Gemini
// WARNING: process.env.GEMINI_API_KEY must be set
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock_key");

// @route   GET api/tasks/daily
// @desc    Get or generate today's task for the couple
// @access  Private
router.get('/daily', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user.partnerId) {
            return res.status(400).json({ msg: 'No partner connected. Please connect with your partner first.' });
        }

        // Find users in the relationship
        const partnerIds = [user.id, user.partnerId].sort();

        // Check if task exists for today (simple date check)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        let task = await Task.findOne({
            coupleIds: { $all: partnerIds },
            date: { $gte: startOfDay }
        });

        if (task) {
            return res.json(task);
        }

        // If no task, generate one using Gemini
        let aiResponse = {
            title: "Share a childhood memory",
            description: "Take turns sharing a funny or meaningful memory from when you were under 10 years old.",
            category: "Deep Talk"
        };

        if (process.env.GEMINI_API_KEY) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const prompt = "Generate one simple, engaging daily activity for a couple to do today to strengthen their relationship. Response must be JSON with keys: title, description, category.";

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Simple cleanup to ensure JSON parsing (AI references often add markdown blocks)
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                aiResponse = JSON.parse(cleanText);
            } catch (aiError) {
                console.error("Gemini Generation Error:", aiError.message);
                // Fallback is already set
            }
        }

        task = new Task({
            coupleIds: partnerIds,
            title: aiResponse.title,
            description: aiResponse.description,
            category: aiResponse.category
        });

        await task.save();
        res.json(task);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/tasks/:id/complete
// @desc    Mark a task as complete
// @access  Private
router.put('/:id/complete', auth, async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ msg: 'Task not found' });
        }

        // Check if user is part of the couple
        if (!task.coupleIds.includes(req.user.id)) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        task.status = 'completed';
        await task.save();

        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
