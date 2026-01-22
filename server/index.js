const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');
const User = require('./models/User');
const Task = require('./models/Task');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/partner', require('./routes/partner'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/charts', require('./routes/charts'));

app.get('/', (req, res) => res.send('API Running'));

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"], // Allow frontend
        methods: ["GET", "POST"]
    }
});

// Make io accessible to routes (AFTER io is initialized)
app.set('io', io);

// Track online users: userId -> socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join_room', (data) => {
        socket.join(data);
        console.log(`User with ID: ${socket.id} joined room: ${data}`);
    });

    socket.on('join_couple_room', (data) => {
        socket.join(data);
        console.log(`User with ID: ${socket.id} joined couple room: ${data}`);
    });

    // User comes online
    socket.on('user_online', async (data) => {
        const { userId, coupleId } = data;
        onlineUsers.set(userId, socket.id);
        socket.join(`user_${userId}`);
        socket.join(`couple_${coupleId}`);

        console.log(`User ${userId} came online`);

        // Notify partner that user is online
        socket.to(`couple_${coupleId}`).emit('partner_online', { userId });

        // Send current state to the user
        try {
            const user = await User.findById(userId).populate('partner');
            if (user && user.partner) {
                // Send latest tasks
                const tasks = await Task.find({
                    $or: [{ user: userId }, { user: user.partner._id }]
                }).sort({ createdAt: -1 }).limit(10);

                socket.emit('tasks_update', tasks);

                // Send partner's mood if available
                if (user.partner.mood) {
                    socket.emit('partner_mood_update', {
                        partnerId: user.partner._id,
                        mood: user.partner.mood,
                        timestamp: user.partner.moodUpdatedAt
                    });
                }
            }
        } catch (error) {
            console.error('Error sending initial state:', error);
        }
    });

    socket.on('send_message', async (data) => {
        // data: { room, author, message, time }
        console.log("SOCKET: Message received:", data);

        // Save to Database
        try {
            if (data.senderId) {
                const newMessage = new Message({
                    sender: data.senderId,
                    room: data.room,
                    text: data.message,
                    timestamp: new Date(data.time)
                });
                const savedMessage = await newMessage.save();
                console.log("SOCKET: Message saved to DB:", savedMessage._id);

                const messageToSend = {
                    ...data,
                    _id: savedMessage._id
                };

                socket.to(data.room).emit('receive_message', messageToSend);
                console.log(`SOCKET: Broadcasting to room ${data.room}`);
            } else {
                console.log("SOCKET: Missing senderId");
            }
        } catch (err) {
            console.error("SOCKET: Error saving message:", err);
        }
    });

    socket.on('typing', (data) => {
        socket.to(data.room).emit('typing');
    });

    socket.on('stop_typing', (data) => {
        socket.to(data.room).emit('stop_typing');
    });

    // Mood update event
    socket.on('mood_update', async (data) => {
        const { userId, mood, coupleId } = data;
        try {
            await User.findByIdAndUpdate(userId, {
                mood: mood,
                moodUpdatedAt: new Date()
            });

            console.log(`User ${userId} updated mood to: ${mood}`);

            // Broadcast mood update to partner
            socket.to(`couple_${coupleId}`).emit('partner_mood_update', {
                partnerId: userId,
                mood: mood,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error updating mood:', error);
        }
    });

    // Task completion/update event
    socket.on('task_update', async (data) => {
        const { taskId, status, coupleId, userId } = data;
        try {
            const updatedTask = await Task.findByIdAndUpdate(taskId, {
                status: status,
                completedAt: status === 'completed' ? new Date() : null
            }, { new: true });

            console.log(`Task ${taskId} updated to status: ${status}`);

            // Broadcast task update to couple
            io.to(`couple_${coupleId}`).emit('task_status_update', {
                task: updatedTask,
                updatedBy: userId
            });
        } catch (error) {
            console.error('Error updating task:', error);
        }
    });

    // Feedback submission event
    socket.on('feedback_submitted', async (data) => {
        const { taskId, feedback, rating, coupleId } = data;
        try {
            const updatedTask = await Task.findByIdAndUpdate(taskId, {
                feedback: feedback,
                rating: rating,
                feedbackSubmittedAt: new Date()
            }, { new: true });

            console.log(`Feedback submitted for task ${taskId}`);

            // Broadcast feedback update to couple
            io.to(`couple_${coupleId}`).emit('feedback_update', {
                task: updatedTask
            });

            // Trigger new task generation if needed
            io.to(`couple_${coupleId}`).emit('trigger_task_generation');
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
    });

    // Dashboard refresh request
    socket.on('refresh_dashboard', async (data) => {
        const { userId, coupleId } = data;
        try {
            // Send latest tasks
            const tasks = await Task.find({
                $or: [{ user: userId }, { user: coupleId }]
            }).sort({ createdAt: -1 }).limit(20);

            socket.emit('dashboard_update', {
                tasks: tasks,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
        }
    });

    socket.on('disconnect', () => {
        // Find and remove the disconnected user
        for (const [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                console.log(`User ${userId} went offline`);

                // Notify partner that user went offline
                socket.to(`couple_${userId}`).emit('partner_offline', { userId });
                break;
            }
        }
        console.log('User Disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
