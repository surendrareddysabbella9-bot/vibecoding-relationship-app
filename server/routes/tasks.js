const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Init Gemini
// WARNING: process.env.GEMINI_API_KEY must be set
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock_key");

// @route   GET api/tasks/history
// @desc    Get all completed tasks for history view
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.partnerId) {
            return res.status(400).json({ msg: 'No partner connected' });
        }

        const partnerIds = [user.id, user.partnerId].sort();

        const tasks = await Task.find({
            coupleIds: { $all: partnerIds },
            status: 'completed'
        })
            .sort({ date: -1 })
            .populate('feedback.userId', 'name')
            .populate('responses.userId', 'name');

        res.json(tasks);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/tasks/daily
// @desc    Get or generate today's task for the couple
// @access  Private
router.get('/daily', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user.partnerId) {
            return res.status(400).json({ msg: 'No partner connected. Please connect with your partner first.' });
        }

        const partner = await User.findById(user.partnerId);

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
            await task.populate('responses.userId', 'name');
            return res.json(task);
        }

        // --- AI GENERATION WITH FEEDBACK HISTORY ---

        // 1. Fetch relevant history (last 5 completed tasks with feedback + responses)
        const historyTasks = await Task.find({
            coupleIds: { $all: partnerIds },
            status: 'completed'
        })
            .sort({ date: -1 })
            .limit(5)
            .select('title category feedback responses');

        // 2. Format history for the prompt
        let historyContext = "No previous history.";
        if (historyTasks.length > 0) {
            historyContext = historyTasks.map(t => {
                const ratings = t.feedback.map(f => `${f.rating}/5`).join(', ');
                const comments = t.feedback.map(f => f.comment ? `"${f.comment}"` : '').filter(c => c).join('; ');
                return `- Task: "${t.title}" (${t.category}). Ratings: [${ratings}]. Comments: [${comments}]`;
            }).join('\n');
        }

        // 3. Simple Sentiment Analysis from recent responses
        let sentimentContext = "No recent responses to analyze.";
        const allResponses = historyTasks.flatMap(t => t.responses || []).slice(0, 10);
        if (allResponses.length > 0) {
            const responseTexts = allResponses.map(r => r.text).join(' ').toLowerCase();
            // Simple keyword-based sentiment detection
            const positiveWords = ['love', 'happy', 'excited', 'grateful', 'amazing', 'wonderful', 'great', 'best', 'joy', 'fun'];
            const negativeWords = ['sad', 'stressed', 'tired', 'angry', 'frustrated', 'worried', 'anxious', 'difficult', 'hard', 'miss'];
            const positiveCount = positiveWords.filter(w => responseTexts.includes(w)).length;
            const negativeCount = negativeWords.filter(w => responseTexts.includes(w)).length;

            if (positiveCount > negativeCount) {
                sentimentContext = "Recent responses show POSITIVE emotional tone. The couple seems happy and engaged.";
            } else if (negativeCount > positiveCount) {
                sentimentContext = "Recent responses show STRESSED/NEGATIVE emotional tone. Consider lighter, supportive prompts.";
            } else {
                sentimentContext = "Recent responses show NEUTRAL emotional tone.";
            }
        }

        // 4. Get Onboarding Data (Preferences) for BOTH partners
        let preferencesContext = "No specific preferences.";
        const prefs = [];
        if (user.onboardingData) {
            prefs.push(`Partner 1: Communication=${user.onboardingData.communicationStyle || 'Unknown'}, Love Language=${user.onboardingData.loveLanguage || 'Unknown'}, Interests=${(user.onboardingData.interests || []).join(', ') || 'Unknown'}`);
        }
        if (partner && partner.onboardingData) {
            prefs.push(`Partner 2: Communication=${partner.onboardingData.communicationStyle || 'Unknown'}, Love Language=${partner.onboardingData.loveLanguage || 'Unknown'}, Interests=${(partner.onboardingData.interests || []).join(', ') || 'Unknown'}`);
        }
        if (prefs.length > 0) preferencesContext = prefs.join('\n');

        // 5. Current Mood & Intensity Context
        let moodContext = "Mood data not available.";
        const moods = [];
        if (user.currentMood) moods.push(`Partner 1: ${user.currentMood} (Intensity: ${user.taskIntensity || 2}/3)`);
        if (partner && partner.currentMood && partner.moodPrivacy) moods.push(`Partner 2: ${partner.currentMood} (Intensity: ${partner.taskIntensity || 2}/3)`);
        if (moods.length > 0) moodContext = moods.join(', ');

        // Calculate target intensity (average of both partners)
        const avgIntensity = Math.round(((user.taskIntensity || 2) + (partner?.taskIntensity || 2)) / 2);
        const intensityLabel = avgIntensity === 1 ? 'LIGHT/CASUAL' : avgIntensity === 3 ? 'DEEP/INTIMATE' : 'BALANCED';

        // If no task, generate one using Gemini
        let aiResponse = {
            title: "Share a childhood memory",
            description: "Take turns sharing a funny or meaningful memory from when you were under 10 years old.",
            category: "Deep Talk"
        };

        if (process.env.GEMINI_API_KEY) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const prompt = `Generate a single daily 'connection prompt' for a couple. 
                They will answer this prompt individually in the app, and then reveal their answers to each other.
                
                === COUPLE PROFILE ===
                ${preferencesContext}

                === CURRENT EMOTIONAL STATE ===
                ${moodContext}
                Sentiment from recent responses: ${sentimentContext}
                
                === DESIRED INTENSITY: ${intensityLabel} (${avgIntensity}/3) ===

                === ACTIVITY HISTORY & FEEDBACK ===
                ${historyContext}
                
                === INSTRUCTIONS ===
                - Create a prompt appropriate for the ${intensityLabel} intensity level.
                - If mood is stressed/tired, suggest lighter, comforting prompts.
                - If mood is happy/romantic, feel free to be more playful or deep.
                - TAILOR the prompt to their Love Languages and Interests.
                - Analyze feedback ratings. If ratings are low for a category, try a different one.
                - DO NOT repeat previous task titles.
                - Response must be strictly JSON with keys: title, description (the framing/question), category.`;

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

// @route   POST api/tasks/:id/respond
// @desc    Submit a response to the task (Interactive Exchange)
// @access  Private
router.post('/:id/respond', auth, async (req, res) => {
    try {
        const { text } = req.body;
        let task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ msg: 'Task not found' });
        if (!task.coupleIds.includes(req.user.id)) return res.status(401).json({ msg: 'Not authorized' });

        // Update Response
        const index = task.responses.findIndex(r => r.userId.toString() === req.user.id);
        if (index > -1) {
            task.responses[index].text = text;
            task.responses[index].date = Date.now();
        } else {
            task.responses.push({ userId: req.user.id, text });
        }

        // Check completion (both responded)
        // We assume 2 people in coupleIds.
        const responderIds = task.responses.map(r => r.userId.toString());
        const allResponded = task.coupleIds.every(id => responderIds.includes(id.toString()));

        if (allResponded) {
            task.status = 'completed';
        }

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

// @route   POST api/tasks/:id/feedback
// @desc    Add feedback to a task
// @access  Private
router.post('/:id/feedback', auth, async (req, res) => {
    const { rating, comment } = req.body;

    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ msg: 'Task not found' });
        }

        if (!task.coupleIds.includes(req.user.id)) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Remove existing feedback from this user if any
        task.feedback = task.feedback.filter(f => f.userId.toString() !== req.user.id);

        // Add new feedback
        task.feedback.push({
            userId: req.user.id,
            rating,
            comment
        });

        await task.save();
        res.json(task);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/tasks/stats
// @desc    Get engagement statistics for the couple
// @access  Private
router.get('/stats', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.partnerId) {
            return res.json({ totalMemories: 0, streak: 0, avgRating: 0 });
        }

        const partnerIds = [user.id, user.partnerId].sort();

        // Get all completed tasks
        const completedTasks = await Task.find({
            coupleIds: { $all: partnerIds },
            status: 'completed'
        }).sort({ date: -1 });

        const totalMemories = completedTasks.length;

        // Calculate average rating
        let totalRatings = 0;
        let ratingCount = 0;
        completedTasks.forEach(t => {
            t.feedback.forEach(f => {
                totalRatings += f.rating;
                ratingCount++;
            });
        });
        const avgRating = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : 0;

        // Calculate streak (consecutive days with completed tasks)
        let streak = 0;
        if (completedTasks.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if there's a task for today or yesterday that's completed (streak continues)
            let checkDate = new Date(today);

            for (let i = 0; i < completedTasks.length; i++) {
                const taskDate = new Date(completedTasks[i].date);
                taskDate.setHours(0, 0, 0, 0);

                // Calculate day difference
                const diffTime = checkDate.getTime() - taskDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 1) {
                    streak++;
                    checkDate = taskDate;
                    // Move check date back by 1 day for next iteration
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break; // Streak broken
                }
            }
        }

        res.json({
            totalMemories,
            streak,
            avgRating: parseFloat(avgRating)
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/tasks/send-reminders
// @desc    Send daily reminder emails (can be triggered by cron job)
// @access  Public (protected by secret key)
router.post('/send-reminders', async (req, res) => {
    // Simple API key protection
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.REMINDER_API_KEY) {
        return res.status(401).json({ msg: 'Unauthorized' });
    }

    try {
        const { sendDailyReminderEmail } = require('../utils/email');

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Find all users with partners who haven't completed today's task
        const users = await User.find({ partnerId: { $ne: null } });

        let emailsSent = 0;
        const errors = [];

        for (const user of users) {
            const partnerIds = [user.id, user.partnerId].sort();

            // Check if task exists for today
            const task = await Task.findOne({
                coupleIds: { $all: partnerIds },
                date: { $gte: startOfDay }
            });

            // Only send reminder if task exists and user hasn't responded
            if (task && task.status !== 'completed') {
                const userResponded = task.responses?.some(r => r.userId.toString() === user.id);

                if (!userResponded) {
                    try {
                        await sendDailyReminderEmail(user.email, user.name, task.title);
                        emailsSent++;
                    } catch (emailErr) {
                        errors.push({ email: user.email, error: emailErr.message });
                    }
                }
            }
        }

        res.json({
            success: true,
            emailsSent,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
