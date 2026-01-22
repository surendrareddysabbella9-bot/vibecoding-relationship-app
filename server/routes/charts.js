const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');

// @route   GET api/charts/data
// @desc    Get chart data for relationship metrics
// @access  Private
router.get('/data', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.partnerId) {
            return res.status(400).json({ msg: 'No partner connected' });
        }

        const partnerIds = [user.id, user.partnerId].sort();

        // Get all completed tasks for the couple
        const tasks = await Task.find({
            coupleIds: { $all: partnerIds },
            status: 'completed'
        }).sort({ date: 1 });

        // Calculate mood trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentTasks = tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate >= thirtyDaysAgo;
        });

        // Mood tracking data
        const moodData = [];
        const moodCounts = { Happy: 0, Stressed: 0, Tired: 0, Romantic: 0, Chill: 0 };

        // Task completion data (last 30 days)
        const completionData = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const tasksOnDate = recentTasks.filter(task => {
                const taskDate = new Date(task.date).toISOString().split('T')[0];
                return taskDate === dateStr;
            });

            completionData.push({
                date: dateStr,
                completed: tasksOnDate.length
            });
        }

        // Communication frequency (responses per day)
        const communicationData = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const responsesOnDate = recentTasks
                .filter(task => {
                    const taskDate = new Date(task.date).toISOString().split('T')[0];
                    return taskDate === dateStr;
                })
                .reduce((total, task) => total + (task.responses ? task.responses.length : 0), 0);

            communicationData.push({
                date: dateStr,
                responses: responsesOnDate
            });
        }

        // Feedback ratings over time
        const feedbackData = [];
        tasks.forEach(task => {
            if (task.feedback && task.feedback.length > 0) {
                const avgRating = task.feedback.reduce((sum, f) => sum + f.rating, 0) / task.feedback.length;
                feedbackData.push({
                    date: task.date,
                    rating: Math.round(avgRating * 10) / 10
                });
            }
        });

        // Streak calculation
        let currentStreak = 0;
        let maxStreak = 0;
        let tempStreak = 0;

        for (let i = tasks.length - 1; i >= 0; i--) {
            const taskDate = new Date(tasks[i].date);
            const today = new Date();
            const diffTime = today.getTime() - taskDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 1) {
                tempStreak++;
                if (tempStreak > maxStreak) maxStreak = tempStreak;
            } else {
                tempStreak = 0;
            }
        }

        currentStreak = tempStreak;

        // Calculate engagement metrics
        const totalTasks = tasks.length;
        const totalResponses = tasks.reduce((sum, task) => sum + (task.responses ? task.responses.length : 0), 0);
        const avgRating = feedbackData.length > 0 ?
            feedbackData.reduce((sum, item) => sum + item.rating, 0) / feedbackData.length : 0;

        res.json({
            moodData,
            completionData,
            communicationData,
            feedbackData,
            streaks: {
                current: currentStreak,
                max: maxStreak
            },
            summary: {
                totalTasks,
                totalResponses,
                avgRating: Math.round(avgRating * 10) / 10,
                completionRate: totalTasks > 0 ? Math.round((totalTasks / 30) * 10) / 10 : 0
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;