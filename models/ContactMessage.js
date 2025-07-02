const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please add your full name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        match: [/.+@.+\..+/, 'Please fill a valid email address']
    },
    subject: {
        type: String,
        required: [true, 'Please add a subject']
    },
    message: {
        type: String,
        required: [true, 'Please add your message']
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
