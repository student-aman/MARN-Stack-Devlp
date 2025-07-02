const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Password hashing ke liye

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true, // Email unique hona chahiye
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please enter a valid email address'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Jab user data fetch hoga, toh password field return nahi hoga security ke liye
    },
    role: {
        type: String,
        enum: ['customer', 'vendor', 'admin'], // User ke roles define karein
        default: 'customer'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Password ko hash karein save karne se pehle
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) { // Agar password modify nahi hua toh aage badho
        next();
    }
    const salt = await bcrypt.genSalt(10); // Salt generate karein
    this.password = await bcrypt.hash(this.password, salt); // Password hash karein
    next();
});

// Password compare karne ka method
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
