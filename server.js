const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const moment = require('moment');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Serve static files (your HTML, CSS, JS) from the public directory
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

// User schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    dob: Date
});
const User = mongoose.model('User', userSchema);

// Email transporter setup (using Gmail and Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Put your gmail address here
        pass: process.env.EMAIL_PASS  // Put your gmail password here
    }
});

// Endpoint to collect user data
app.post('/add-birthday', async (req, res) => {
    const { username, email, dob } = req.body;
    try {
        const user = new User({ username, email, dob });
        await user.save();
        res.status(201).send('Birthday saved');
    } catch (err) {
        res.status(500).send('Error saving birthday');
    }
});

// Cron job to send birthday emails every day at 7am
cron.schedule('0 7 * * *', async () => {
    const today = new Date().toISOString().slice(5, 10); // MM-DD format
    const users = await User.find();

    users.forEach(user => {
        const userDOB = new Date(user.dob).toISOString().slice(5, 10); // Get MM-DD of user's birthday
        if (userDOB === today) {
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: user.email,
                subject: `Happy Birthday, ${user.username}!`,
                html: `<h1>Happy Birthday, ${user.username}!</h1><p>Wishing you a fantastic day filled with joy and happiness!</p>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email: ', error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        }
    });
});

// Start the server

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
