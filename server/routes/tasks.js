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
        // PRODUCTION MODE: Check if task exists since start of today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today
        const cutoffTime = today;

        let task = await Task.findOne({
            coupleIds: { $all: partnerIds },
            date: { $gte: cutoffTime }
        });

        // TASK QUEUE LOGIC: If there's an incomplete task (one person hasn't responded), return it
        // This ensures no task is skipped unless both partners explicitly skip it
        if (task) {
            const responderIds = task.responses.map(r => r.userId.toString());
            const allResponded = partnerIds.every(id => responderIds.includes(id));

            // If not everyone has responded, return the incomplete task
            if (!allResponded) {
                await task.populate('responses.userId', 'name');
                return res.json(task);
            }

            // If everyone responded but feedback is incomplete, still return it
            const feedbackCount = task.feedback.length;
            if (feedbackCount < 2) {
                await task.populate('responses.userId', 'name');
                return res.json(task);
            }

            // Task is fully completed, proceed to generate new one
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

        // DIVERSE FALLBACK TASKS - Used when Gemini fails
        const fallbackTasks = [
            {
                title: "What's one thing your partner did for you recently?",
                description: "Share a moment when your partner made you feel loved or supported. What was it, and how did it make you feel?",
                category: "Gratitude"
            },
            {
                title: "Describe your ideal weekend together",
                description: "Paint a picture of what your dream weekend looks like. No budget limits—what would you do?",
                category: "Dream Sharing"
            },
            {
                title: "What's a skill of yours that you think your partner admires?",
                description: "Think about something you're good at. Why do you think your partner values it?",
                category: "Vulnerability"
            },
            {
                title: "If you could give your partner one superpower, what would it be?",
                description: "Imagine you could give them any ability. Why that one? What would they do with it?",
                category: "Playful Challenge"
            },
            {
                title: "Share something you learned about each other recently",
                description: "Tell your partner something new you discovered about them—it could be big or small!",
                category: "Icebreaker"
            },
            {
                title: "What does quality time look like to you?",
                description: "How do you feel most connected to your partner? What activities or moments matter most?",
                category: "Deep Talk"
            },
            {
                title: "Describe a moment when you felt truly seen by your partner",
                description: "When did they really understand you? What was happening, and why did it matter?",
                category: "Intimacy"
            },
            {
                title: "What's a challenge you're both facing together?",
                description: "Talk about something you're working through as a team. How can you support each other?",
                category: "Growth"
            },
            {
                title: "If you could give your relationship one upgrade, what would it be?",
                description: "What's one thing you'd love to improve or experience together?",
                category: "Adventure Planning"
            },
            {
                title: "What's your favorite memory together so far?",
                description: "Think back to a moment that makes you smile. Why is it special to you?",
                category: "Deep Talk"
            }
        ];

        // Select random fallback or prefer based on sentiment
        let fallbackIndex = 0;
        if (sentimentContext.includes('STRESSED')) {
            fallbackIndex = 0; // Gratitude - comforting
        } else if (sentimentContext.includes('POSITIVE')) {
            fallbackIndex = Math.floor(Math.random() * fallbackTasks.length);
        } else {
            fallbackIndex = Math.floor(Math.random() * fallbackTasks.length);
        }

        // If we've used recent tasks, skip those indices
        const recentTitles = historyTasks.map(t => t.title.toLowerCase());
        for (let i = 0; i < fallbackTasks.length; i++) {
            if (!recentTitles.includes(fallbackTasks[i].title.toLowerCase())) {
                fallbackIndex = i;
                break;
            }
        }

        let aiResponse = fallbackTasks[fallbackIndex];

        if (process.env.GEMINI_API_KEY) {
            console.log("Attempting to generate task with Gemini...");
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const prompt = `Generate a UNIQUE daily 'connection prompt' for a couple. They answer individually and reveal answers together.

                === COUPLE PROFILE ===
                ${preferencesContext}

                === CURRENT EMOTIONAL STATE ===
                ${moodContext}
                Sentiment Analysis: ${sentimentContext}
                
                === TASK INTENSITY REQUIRED: ${intensityLabel} (${avgIntensity}/3) ===

                === RECENT TASK HISTORY (AVOID THESE!) ===
                ${historyContext}
                
                === CRITICAL INSTRUCTIONS FOR GENERATION ===
                
                **EMOTIONAL INTELLIGENCE:**
                - If sentiment is STRESSED/NEGATIVE: Generate supportive, comforting, low-pressure tasks (e.g., "What made you smile today?" or "How can I support you right now?")
                - If sentiment is POSITIVE/HAPPY: Generate playful, celebratory, or deeper connection tasks
                - If sentiment is NEUTRAL: Balance between fun and meaningful
                
                **PERSONALIZATION:**
                - Use BOTH partners' Communication Styles in the prompt framing
                - Incorporate their Love Languages (e.g., if Love Language is "Acts of Service", ask "What's one thing your partner did for you recently?")
                - Reference their Interests when possible
                
                **ANTI-REPETITION RULES (MANDATORY):**
                - DO NOT use ANY task title from the history above
                - Vary task CATEGORIES: alternate between "Icebreaker", "Deep Talk", "Fun Activity", "Gratitude", "Dream Sharing", "Playful Challenge", "Vulnerability", "Adventure Planning"
                - DO NOT repeat task themes (e.g., if recent tasks were about childhood/memories, do something else like future goals or daily habits)
                - Each prompt should be distinctly different in TOPIC and TONE
                
                **QUALITY REQUIREMENTS:**
                - Title: Compelling, specific, 5-10 words (e.g., "What's a skill you secretly admire in your partner?")
                - Description: Clear, 1-2 sentences, conversational tone, invites authentic response
                - Category: One of [Icebreaker, Deep Talk, Fun Activity, Gratitude, Dream Sharing, Playful Challenge, Vulnerability, Adventure Planning, Intimacy, Growth]
                - Tone: Match the ${intensityLabel} level and current emotional sentiment
                
                === OUTPUT FORMAT ===
                Response must be STRICTLY valid JSON (no markdown, no extra text):
                {"title": "...", "description": "...", "category": "..."}`;

                console.log("🤖 [Gemini] Sending prompt to Gemini API...");
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                console.log("🤖 [Gemini] Raw response:", text.substring(0, 200));

                // Simple cleanup to ensure JSON parsing (AI references often add markdown blocks)
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

                try {
                    aiResponse = JSON.parse(cleanText);
                    console.log("✅ [Gemini] Successfully generated task:", aiResponse.title);
                } catch (jsonError) {
                    console.error("❌ [Gemini] JSON parse error. Raw text:", cleanText);
                    console.error("❌ [Gemini] JSON Error:", jsonError.message);
                    throw jsonError;
                }
            } catch (aiError) {
                console.error("❌ [Gemini] Generation Error:", aiError.message);
                console.error("❌ [Gemini] Full error:", aiError);
                console.log("⚠️  [Gemini] Using fallback task:", aiResponse.title);
                // Fallback is already set
            }
        } else {
            console.log("⚠️  [Gemini] GEMINI_API_KEY not configured, using fallback task:", aiResponse.title);
        }

        task = new Task({
            coupleIds: partnerIds,
            title: aiResponse.title,
            description: aiResponse.description,
            category: aiResponse.category
        });

        await task.save();

        // Emit new task to both partners
        const io = req.app.get('io');
        const coupleRoom = partnerIds.sort().join('_');
        io.to(coupleRoom).emit('new_task_generated', {
            task: task
        });

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

        // Emit real-time update to couple room
        const io = req.app.get('io');
        const coupleRoom = task.coupleIds.map(id => id.toString()).sort().join('_');
        io.to(coupleRoom).emit('partner_responded', {
            taskId: task._id,
            responses: task.responses,
            status: task.status
        });

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

        // Emit real-time update to couple room
        const io = req.app.get('io');
        const coupleRoom = task.coupleIds.map(id => id.toString()).sort().join('_');
        io.to(coupleRoom).emit('partner_feedback', {
            taskId: task._id,
            feedback: task.feedback
        });

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
