const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Service = require('./models/Service');
const Booking = require('./models/Booking');
const User = require('./models/User');
const ContactMessage = require('./models/ContactMessage');
const Vendor = require('./models/Vendor');
const bcrypt = require('bcryptjs');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

dotenv.config({ path: './.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Pagination Constants
const INITIAL_LOAD_LIMIT = 8; // How many services to show initially
const LOAD_MORE_LIMIT = 4;    // How many more services to load on "View More" click

const MONGODB_URI = process.env.MONGO_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGO_URI is not defined in .env file.');
    process.exit(1);
}

// MongoDB Session Store setup
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions', // Name of the collection where sessions will be stored
    expires: 1000 * 60 * 60 * 24 * 7 // Session expiry: 7 days (in milliseconds)
});

// Catch errors
store.on('error', function(error) {
    console.error('MongoDB Session Store Error:', error);
});

// Connect to MongoDB and start the server
const StartServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            console.log(`🚀 Server running on http://localhost:${PORT} in your browser`);
        });
    } catch (error) {
        console.error(`❌ Server could not start due to DB connection error: ${error.message}`);
        process.exit(1);
    }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_super_secret_key', // Replace with a strong, random key in .env
    resave: false, // Do not save session on every request if no changes
    saveUninitialized: false, // Do not store uninitialized sessions
    store: store, // Use MongoDB store
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expiry: 7 days
        // secure: process.env.NODE_ENV === 'production' // Set to true for HTTPS in production
    }
}));

// Make current user available to EJS templates via res.locals
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});

// --- Middleware to check if user is logged in ---
const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login?error=' + encodeURIComponent('You must be logged in to access this page.'));
    }
};


// --- HOME PAGE ROUTE ---
app.get('/', async (req, res) => {
    try {
        const popularServices = await Service.find({}).limit(4);
        res.render('home', {
            title: 'SkillHub',
            popularServices: popularServices
        });
    } catch (error) {
        console.error('Error fetching popular services for home page:', error);
        res.render('home', {
            title: 'SkillHub',
            popularServices: []
        });
    }
});

// --- API for Search Suggestions ---
app.get('/api/search-suggestions', async (req, res) => {
    const query = req.query.q; // Get the search query from the request
    if (!query) {
        return res.json([]); // If no query, return empty array
    }
    try {
        // Find services where title or description matches the query (case-insensitive)
        const suggestions = await Service.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } }
            ]
        }).limit(5).select('title'); // Limit to 5 suggestions and only return the title

        res.json(suggestions.map(service => service.title)); // Return only the titles as an array of strings
    } catch (error) {
        console.error('Error fetching search suggestions:', error);
        res.status(500).json([]); // Return empty array on error
    }
});


// --- ABOUT US ROUTE ---
app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us - SkillHub' });
});


// --- USER AUTHENTICATION ROUTES (General User) ---
app.get('/register', (req, res) => {
    res.render('register', { title: 'Register - SkillHub', errorMessage: null, successMessage: null });
});
app.post('/register', async (req, res) => {
    const { name, email, password, password2 } = req.body;
    if (password !== password2) {
        return res.render('register', { title: 'Register - SkillHub', errorMessage: 'Passwords do not match.', name, email, successMessage: null });
    }
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.render('register', { title: 'Register - SkillHub', errorMessage: 'User with this email already exists.', name, email, successMessage: null });
        }
        user = new User({ name, email, password });
        await user.save();
        console.log('✅ User registered successfully:', user.email);
        res.redirect('/login?message=Registration Successful! Please login.');
    } catch (error) {
        console.error('❌ Error registering user:', error);
        let errorMessage = 'Registration failed. Please try again.';
        if (error.code === 11000) { errorMessage = 'User with this email already exists.'; }
        else if (error.name === 'ValidationError') { errorMessage = Object.values(error.errors).map(val => val.message).join(', '); }
        res.render('register', { title: 'Register - SkillHub', errorMessage: errorMessage, name, email, successMessage: null });
    }
});

app.get('/login', (req, res) => {
    const message = req.query.message || null;
    const errorMessage = req.query.error || null;
    res.render('login', { title: 'Login - SkillHub', errorMessage: errorMessage, successMessage: message });
});

// --- NORMAL USER LOGIN POST ROUTE ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('--- User Login Attempt ---');
    console.log('Received email:', email);

    try {
        const user = await User.findOne({ email }).select('+password');
        console.log('User found in DB:', user ? user.email : 'No user found with this email');

        if (!user) {
            console.log('Login failed: User not found.');
            return res.render('login', { // Render normal login page on failure
                title: 'Login - SkillHub',
                errorMessage: 'Invalid credentials.',
                successMessage: null,
                email
            });
        }

        const isMatch = await user.matchPassword(password);
        console.log('Password match result:', isMatch);

        if (!isMatch) {
            console.log('Login failed: Password mismatch.');
            return res.render('login', { // Render normal login page on failure
                title: 'Login - SkillHub',
                errorMessage: 'Invalid credentials.',
                successMessage: null,
                email
            });
        }

        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role // Store the role in session
        };
        console.log('✅ User logged in successfully! Session set for:', req.session.user.email);
        // Redirect normal users to the home page or a user dashboard
        res.redirect('/'); // Redirect to home page

    } catch (error) {
        console.error('❌ Error during user login process:', error);
        res.render('login', {
            title: 'Login - SkillHub',
            errorMessage: 'Login failed due to a server error. Please try again.',
            successMessage: null,
            email
        });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('❌ Error destroying session:', err);
            return res.status(500).send('Could not log out. Please try again.');
        }
        res.clearCookie('connect.sid');
        console.log('🚪 User logged out successfully.');
        res.redirect('/login?message=You have been logged out.');
    });
});


// --- USER DASHBOARD ROUTE ---
app.get('/dashboard', isLoggedIn, async (req, res) => {
    try {
        // Fetch bookings for the logged-in user
        const userBookings = await Booking.find({ customerEmail: req.session.user.email }).sort({ preferredDate: -1 });

        res.render('dashboard', {
            title: 'Mera Dashboard - SkillHub',
            user: req.session.user, // Pass current user data
            bookings: userBookings
        });
    } catch (error) {
        console.error('❌ Error fetching user dashboard data:', error);
        res.status(500).send('Server Error: Could not load dashboard.');
    }
});

// --- USER PROFILE ROUTE (View Profile) ---
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        // Fetch the full user object from the database to ensure latest data
        const user = await User.findById(req.session.user._id).select('-password');
        if (!user) {
            // If user somehow not found in DB after session, log out
            req.session.destroy(err => {
                console.error('User not found in DB for profile page, logging out:', req.session.user._id);
                res.redirect('/login?error=' + encodeURIComponent('Your session expired or user not found. Please login again.'));
            });
            return;
        }
        res.render('profile', {
            title: 'Mera Profile - SkillHub',
            user: user, // Pass the full user object
            successMessage: req.query.success || null, // Get from query if redirected from edit
            errorMessage: req.query.error || null // Get from query if redirected from edit
        });
    } catch (error) {
        console.error('❌ Error fetching user profile data:', error);
        res.status(500).send('Server Error: Could not load your profile.');
    }
});

// --- USER PROFILE EDIT ROUTES ---
// GET route to display the edit profile form
app.get('/profile/edit', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id).select('-password');
        if (!user) {
            req.session.destroy(err => {
                console.error('User not found for profile edit, logging out:', req.session.user._id);
                res.redirect('/login?error=' + encodeURIComponent('Your session expired or user not found. Please login again.'));
            });
            return;
        }
        res.render('profile_edit', {
            title: 'Profile Edit Karein - SkillHub',
            user: user, // Pass current user data to pre-fill form
            errorMessage: null,
            successMessage: null
        });
    } catch (error) {
        console.error('❌ Error fetching user data for profile edit:', error);
        res.status(500).send('Server Error: Could not load profile edit form.');
    }
});

// PUT route to handle profile updates
app.put('/profile/edit', isLoggedIn, async (req, res) => {
    const { name, email, currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.session.user._id;

    try {
        const user = await User.findById(userId).select('+password'); // Select password to compare
        if (!user) {
            return res.redirect('/profile/edit?error=' + encodeURIComponent('User not found.'));
        }

        // Check if email is being changed and if new email is already taken by another user
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: userId } });
            if (emailExists) {
                return res.render('profile_edit', {
                    title: 'Profile Edit Karein - SkillHub',
                    user: user, // Pass original user data back
                    errorMessage: 'Yeh email pehle se hi registered hai.',
                    successMessage: null
                });
            }
        }

        // Update name and email
        user.name = name || user.name;
        user.email = email || user.email;

        // Handle password change if newPassword is provided
        if (newPassword) {
            if (!currentPassword) {
                return res.render('profile_edit', {
                    title: 'Profile Edit Karein - SkillHub',
                    user: user,
                    errorMessage: 'Naya password set karne ke liye purana password daalein.',
                    successMessage: null
                });
            }
            // Verify current password
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                return res.render('profile_edit', {
                    title: 'Profile Edit Karein - SkillHub',
                    user: user,
                    errorMessage: 'Purana password galat hai.',
                    successMessage: null
                });
            }
            // Check if new passwords match
            if (newPassword !== confirmNewPassword) {
                return res.render('profile_edit', {
                    title: 'Profile Edit Karein - SkillHub',
                    user: user,
                    errorMessage: 'Naye passwords match nahi karte.',
                    successMessage: null
                });
            }
            // Update password (pre-save hook will hash it)
            user.password = newPassword;
        }

        await user.save();

        // Update session user data (important for header and dashboard)
        req.session.user.name = user.name;
        req.session.user.email = user.email;

        console.log('✅ User profile updated successfully:', user.email);
        res.redirect('/profile?success=' + encodeURIComponent('Profile safaltaapoorvak update ho gaya hai!'));

    } catch (error) {
        console.error('❌ Error updating user profile:', error);
        let errorMessage = 'Profile update mein koi dikkat aayi. Kripya phir se koshish karein.';
        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
        } else if (error.code === 11000) {
            errorMessage = 'Yeh email pehle se hi kisi aur user dwara istemal kiya ja raha hai.';
        }
        // Re-fetch user to send back to the form in case of error
        const userOnError = await User.findById(userId).select('-password');
        res.render('profile_edit', {
            title: 'Profile Edit Karein - SkillHub',
            user: userOnError || req.session.user, // Fallback to session user if DB fetch fails
            errorMessage: errorMessage,
            successMessage: null
        });
    }
});


// --- CONTACT US ROUTES ---
app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us - SkillHub', successMessage: null, errorMessage: null });
});
app.post('/contact', async (req, res) => {
    const { fullName, email, subject, message } = req.body;
    try {
        const newContactMessage = new ContactMessage({ fullName, email, subject, message });
        await newContactMessage.save();
        console.log('✅ Contact message saved to MongoDB:', newContactMessage);
        res.redirect('/contact-success');
    } catch (error) {
        console.error('❌ Error saving contact message to MongoDB:', error);
        let errorMessage = 'Failed to send your message. Please try again.';
        if (error.name === 'ValidationError') { errorMessage = Object.values(error.errors).map(val => val.message).join(', '); }
        else if (error.code === 11000) { errorMessage = 'Duplicate entry detected (e.g., same email/subject too quickly).'; }
        res.render('contact', { title: 'Contact Us - SkillHub', successMessage: null, errorMessage: errorMessage, formData: { fullName, email, subject, message } });
    }
});
app.get('/contact-success', (req, res) => {
    res.render('contact_success', { title: 'Message Sent Successfully!' });
});

// --- VENDOR REGISTRATION ROUTES ---
app.get('/vendor/register', (req, res) => {
    res.render('vendor_register', { title: 'Vendor Registration - SkillHub', successMessage: null, errorMessage: null, formData: {} });
});
app.post('/vendor/register', async (req, res) => {
    const { companyName, contactPerson, email, phone, serviceCategory, description } = req.body;
    try {
        let existingVendor = await Vendor.findOne({ email });
        if (existingVendor) {
            return res.render('vendor_register', { title: 'Vendor Registration - SkillHub', errorMessage: 'A vendor with this email is already registered.', successMessage: null, formData: { companyName, contactPerson, email, phone, serviceCategory, description } });
        }
        const newVendor = new Vendor({ companyName, contactPerson, email, phone, serviceCategory, description });
        await newVendor.save();
        console.log('✅ Vendor registered successfully:', newVendor.email);
        res.redirect('/vendor/register-success');
    } catch (error) {
        console.error('❌ Error saving vendor registration to MongoDB:', error);
        let errorMessage = 'Vendor registration failed. Please try again.';
        if (error.name === 'ValidationError') { errorMessage = Object.values(error.errors).map(val => val.message).join(', '); }
        else if (error.code === 11000) { errorMessage = 'A vendor with this email is already registered.'; }
        res.render('vendor_register', { title: 'Vendor Registration - SkillHub', errorMessage: errorMessage, successMessage: null, formData: { companyName, contactPerson, email, phone, serviceCategory, description } });
    }
});
app.get('/vendor/register-success', (req, res) => {
    res.render('vendor_register_success', { title: 'Vendor Registration Successful!' });
});

// --- MAIN SERVICE RELATED ROUTES ---

// Initial load of services page
app.get('/services', async (req, res) => {
    try {
        const initialServices = await Service.find({}).limit(INITIAL_LOAD_LIMIT);
        const totalServicesCount = await Service.countDocuments(); // Get total count for pagination logic

        res.render('services', {
            title: 'Our Services - SkillHub',
            services: initialServices,
            initialLimit: INITIAL_LOAD_LIMIT,
            totalCount: totalServicesCount,
            LOAD_MORE_LIMIT: LOAD_MORE_LIMIT
        });
    } catch (error) {
        console.error('Error fetching initial services for services page:', error);
        res.status(500).send('Server Error: Could not load services.');
    }
});

// API endpoint to load more services (for AJAX requests)
app.get('/api/services', async (req, res) => {
    try {
        const skip = parseInt(req.query.skip) || 0; // How many services to skip
        const limit = parseInt(req.query.limit) || LOAD_MORE_LIMIT; // How many services to load

        const services = await Service.find({}).skip(skip).limit(limit);
        const totalServicesCount = await Service.countDocuments();

        // Check if there are more services to load
        const hasMore = (skip + services.length) < totalServicesCount;

        res.json({
            services: services,
            hasMore: hasMore
        });
    } catch (error) {
        console.error('Error fetching more services via API:', error);
        res.status(500).json({ message: 'Error fetching more services.' });
    }
});


app.get('/service/:id', async (req, res) => {
    const serviceId = req.params.id;
    console.log(`DEBUG: Request received for /service/${serviceId}`);
    try {
        // FIXED: Fetch service by custom 'id' field instead of MongoDB's _id
        const service = await Service.findOne({ id: serviceId }); 
        if (service) {
            console.log(`DEBUG: Service found: ${service.title}`);
            const reviews = [
                { customerName: 'Anjali Sharma', customerImage: 'https://images.unsplash.com/photo-1729178249799-fe7e7943e68f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG9vdG8tcmVsYXRlZHwxMHx8fGVufDB8fHx8', rating: 4.5, comment: 'Excellent work! Delivered exactly as envisioned.', date: '2025-06-10' },
                { customerName: 'Rahul Singh', customerImage: 'https://media.istockphoto.com/id/2106932099/photo/confident-business-professional-posing-in-a-modern-office-environment.webp?a=1&s=612x612&w=0&k=20&c=nzRTsh9W-lMtLVS1z8niVgjK0Jjmm7t8v155mXCSCIE=', rating: 5, comment: 'Simply the best! Very professional and highly skilled.', date: '2025-05-28' },
                { customerName: 'Deepak Kumar', customerImage: 'https://plus.unsplash.com/premium_photo-1682089877310-b2308b0dc719?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDEyfHx8ZW58MHx8fHx8', rating: 4, comment: 'Good service, met expectations. Would recommend.', date: '2025-06-01' }
            ];
            // FIXED: Use custom 'id' for similar services query too
            const similarServices = await Service.find({ category: service.category, id: { $ne: service.id } }).limit(3); 
            res.render('service_detail', { title: `${service.title} - SkillHub`, service: service, reviews: reviews, similarServices: similarServices });
        } else {
            console.log(`DEBUG: Service with ID ${serviceId} not found. Rendering 404.`);
            // If service not found by custom ID, render a generic 404
            res.status(404).render('404', { title: 'Service Not Found' });
        }
    } catch (error) {
        console.error('ERROR: Error fetching service details for /service/:id route:', error);
        // Removed specific CastError handling as it's no longer relevant for findOne({ id: serviceId })
        res.status(500).send('Server Error: Could not load service details.');
    }
});

app.get('/book-service/:id', async (req, res) => {
    const serviceId = req.params.id;
    try {
        const service = await Service.findOne({ id: serviceId }); // Changed to findOne by custom id
        if (service) { res.render('booking_form', { title: `Book ${service.title}`, service: service }); }
        else { res.status(404).render('404', { title: 'Service Not Found' }); }
    } catch (error) {
        console.error('Error fetching service for booking form:', error);
        res.status(500).send('Server Error: Could not load booking form.');
    }
});

app.post('/book-service', async (req, res) => {
    const { serviceId, serviceTitle, vendorName, fullName, email, phone, preferredDate, message } = req.body;
    try {
        const newBooking = new Booking({ serviceId, serviceTitle, vendorName, customerName: fullName, customerEmail: email, customerPhone: phone, preferredDate: new Date(preferredDate), message });
        await newBooking.save();
        res.redirect('/booking-success');
    } catch (error) {
        console.error('❌ Error saving booking to MongoDB:', error);
        if (error.name === 'ValidationError') { res.status(400).send(`Booking failed: ${error.message}`); }
        else { res.status(500).send('Booking failed due to a server error. Please try again.'); }
    }
});

app.get('/booking-success', (req, res) => {
    res.render('booking_success', { title: 'Booking Successful!' });
});

app.get('/search-results', async (req, res) => {
    const searchQuery = req.query.query ? req.query.query.toLowerCase() : '';
    const searchLocation = req.query.location ? req.query.location.toLowerCase() : '';
    try {
        let query = {};
        if (searchQuery) { query.$or = [{ title: { $regex: searchQuery, $options: 'i' } }, { description: { $regex: searchQuery, $options: 'i' } }, { category: { $regex: searchQuery, $options: 'i' } }, { vendorName: { $regex: searchQuery, $options: 'i' } }]; }
        if (searchLocation) { query.location = { $regex: searchLocation, $options: 'i' }; }
        const filteredServices = await Service.find(query);
        res.render('search_results', { title: `Search Results for "${searchQuery || 'All Services'}" in ${searchLocation || 'All Locations'}`, query: searchQuery, location: searchLocation, services: filteredServices });
    }
    catch (error) {
        console.error('Error fetching services for search results:', error);
        res.status(500).send('Server Error: Could not process search.');
    }
});

// --- ADMIN ROUTES (Main Dashboard and Sub-pages) ---

// Authentication middleware for admin routes
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/admin/login?error=' + encodeURIComponent('You must be logged in as an admin to access this page.'));
    }
};

// Admin Login Page (GET)
app.get('/admin/login', (req, res) => {
    const message = req.query.message || null;
    const errorMessage = req.query.error || null;
    res.render('admin_login', {
        title: 'Admin Login',
        errorMessage: errorMessage,
        successMessage: message
    });
});

// Admin Login (POST) - This is for ADMINS ONLY
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('--- Admin Login Attempt ---');
    console.log('Received email:', email);

    try {
        const user = await User.findOne({ email }).select('+password');
        console.log('User found in DB:', user ? user.email : 'No user found with this email');
        console.log('User role from DB:', user ? user.role : 'N/A');

        if (!user) {
            console.log('Login failed: User not found.');
            return res.render('admin_login', {
                title: 'Admin Login',
                errorMessage: 'Invalid credentials.',
                successMessage: null,
                email
            });
        }

        if (user.role !== 'admin') {
            console.log('Login failed: User is not an admin.');
            return res.render('admin_login', {
                title: 'Admin Login',
                errorMessage: 'Invalid credentials or not an admin.',
                successMessage: null,
                email
            });
        }

        const isMatch = await user.matchPassword(password);
        console.log('Password match result:', isMatch);

        if (!isMatch) {
            console.log('Login failed: Password mismatch.');
            return res.render('admin_login', {
                title: 'Admin Login',
                errorMessage: 'Invalid credentials.',
                successMessage: null,
                email
            });
        }

        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        console.log('✅ Admin logged in successfully! Session set for:', req.session.user.email);
        console.log('Redirecting to /admin');
        res.redirect('/admin'); // Redirect admins to the admin dashboard

    } catch (error) {
        console.error('❌ Error during admin login process:', error);
        res.render('admin_login', {
            title: 'Admin Login',
            errorMessage: 'Login failed due to a server error. Please try again.',
            successMessage: null,
            email
        });
    }
});


// Admin Dashboard - PROTECTED
app.get('/admin', isAdmin, (req, res) => {
    res.render('admin_dashboard', { title: 'Admin Dashboard - SkillHub' });
});

// Admin - Users Management Page (GET all users) - PROTECTED
app.get('/admin/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_users', { title: 'Manage Users - SkillHub Admin', users: users, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching users for admin dashboard:', error);
        res.status(500).send('Server Error: Could not load users.');
    }
});

// Admin - GET User Edit Form - PROTECTED
app.get('/admin/users/edit/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).render('404', { title: 'User Not Found' });
        }
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_user_edit', { title: `Edit User: ${user.name}`, user: user, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching user for edit:', error);
        res.status(500).send('Server Error: Could not load user for editing.');
    }
});

// Admin - PUT (Update) User - PROTECTED
app.put('/admin/users/edit/:id', isAdmin, async (req, res) => {
    const { name, email, role } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).redirect('/admin/users?error=User not found for update.');
        }

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
            if (emailExists) {
                return res.redirect(`/admin/users/edit/${user._id}?error=${encodeURIComponent('Email already in use by another user.')}`);
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;

        await user.save();
        console.log('✅ User updated successfully:', user.email);
        res.redirect('/admin/users?success=User updated successfully!');

    } catch (error) {
        console.error('❌ Error updating user:', error);
        let errorMessage = 'User update failed. Please try again.';
        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
        }
        res.redirect(`/admin/users/edit/${req.params.id}?error=${encodeURIComponent(errorMessage)}`);
    }
});

// Admin - DELETE User - PROTECTED
app.delete('/admin/users/delete/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).redirect('/admin/users?error=User not found for deletion.');
        }
        console.log('🗑️ User deleted successfully:', user.email);
        res.redirect('/admin/users?success=User deleted successfully!');
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.redirect('/admin/users?error=Failed to delete user.');
    }
});


// Admin - Services Management Page - PROTECTED
app.get('/admin/services', isAdmin, async (req, res) => {
    try {
        const services = await Service.find({});
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_services', { title: 'Manage Services - SkillHub Admin', services: services, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching services for admin dashboard:', error);
        res.status(500).send('Server Error: Could not load services.');
    }
});

// Admin - GET Service Edit Form - PROTECTED
app.get('/admin/services/edit/:id', isAdmin, async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).render('404', { title: 'Service Not Found' });
        }
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_service_edit', { title: `Edit Service: ${service.title}`, service: service, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching service for edit:', error);
        res.status(500).send('Server Error: Could not load service for editing.');
    }
});

// Admin - PUT (Update) Service - PROTECTED
app.put('/admin/services/edit/:id', isAdmin, async (req, res) => {
    const { title, description, category, price, vendorName, imageUrl, vendorImage, location } = req.body;
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).redirect('/admin/services?error=Service not found for update.');
        }

        service.title = title || service.title;
        service.description = description || service.description;
        service.category = category || service.category;
        service.price = price || service.price;
        service.vendorName = vendorName || service.vendorName;
        service.imageUrl = imageUrl || service.imageUrl;
        service.vendorImage = vendorImage || service.vendorImage;
        service.location = location || service.location;

        await service.save();
        console.log('✅ Service updated successfully:', service.title);
        res.redirect('/admin/services?success=Service updated successfully!');

    } catch (error) {
        console.error('❌ Error updating service:', error);
        let errorMessage = 'Service update failed. Please try again.';
        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
        }
        res.redirect(`/admin/services/edit/${req.params.id}?error=${encodeURIComponent(errorMessage)}`);
    }
});

// Admin - DELETE Service - PROTECTED
app.delete('/admin/services/delete/:id', isAdmin, async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) {
            return res.status(404).redirect('/admin/services?error=Service not found for deletion.');
        }
        console.log('🗑️ Service deleted successfully:', service.title);
        res.redirect('/admin/services?success=Service deleted successfully!');
    } catch (error) {
        console.error('❌ Error deleting service:', error);
        res.redirect('/admin/services?error=Failed to delete service.');
    }
});


// Admin - Bookings Management Page - PROTECTED
app.get('/admin/bookings', isAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find({});
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_bookings', { title: 'Manage Bookings - SkillHub Admin', bookings: bookings, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching bookings for admin dashboard:', error);
        res.status(500).send('Server Error: Could not load bookings.');
    }
});

// Admin - GET Booking Edit Form - PROTECTED
app.get('/admin/bookings/edit/:id', isAdmin, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).render('404', { title: 'Booking Not Found' });
        }
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_booking_edit', { title: `Edit Booking: ${booking.serviceTitle}`, booking: booking, successMessage, errorMessage });
    }  catch (error) {
        console.error('❌ Error fetching booking for edit:', error);
        res.status(500).send('Server Error: Could not load booking for editing.');
    }
});

// Admin - PUT (Update) Booking - PROTECTED
app.put('/admin/bookings/edit/:id', isAdmin, async (req, res) => {
    const { preferredDate, message, status } = req.body;
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).redirect('/admin/bookings?error=Booking not found for update.');
        }

        booking.preferredDate = new Date(preferredDate) || booking.preferredDate;
        booking.message = message || booking.message;
        booking.status = status || booking.status;

        await booking.save();
        console.log('✅ Booking updated successfully:', booking._id);
        res.redirect('/admin/bookings?success=Booking updated successfully!');

    } catch (error) {
        console.error('❌ Error updating booking:', error);
        let errorMessage = 'Booking update failed. Please try again.';
        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
        }
        res.redirect(`/admin/bookings/edit/${req.params.id}?error=${encodeURIComponent(errorMessage)}`);
    }
});

// Admin - DELETE Booking - PROTECTED
app.delete('/admin/bookings/delete/:id', isAdmin, async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) {
            return res.status(404).redirect('/admin/bookings?error=Booking not found for deletion.');
        }
        console.log('🗑️ Booking deleted successfully:', booking._id);
        res.redirect('/admin/bookings?success=Booking deleted successfully!');
    } catch (error) {
        console.error('❌ Error deleting booking:', error);
        res.redirect('/admin/bookings?error=Failed to delete booking.');
    }
});


// Admin - Contact Messages Management Page
app.get('/admin/contact-messages', isAdmin, async (req, res) => {
    try {
        const contactMessages = await ContactMessage.find({});
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_contact_messages', { title: 'Manage Contact Messages - SkillHub Admin', contactMessages: contactMessages, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching contact messages for admin dashboard:', error);
        res.status(500).send('Server Error: Could not load contact messages.');
    }
});

// Admin - GET Contact Message View Page
app.get('/admin/contact-messages/view/:id', isAdmin, async (req, res) => {
    try {
        const contactMessage = await ContactMessage.findById(req.params.id);
        if (!contactMessage) {
            return res.status(404).render('404', { title: 'Message Not Found' });
        }
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_contact_message_view', { title: `View Message: ${contactMessage.subject}`, contactMessage: contactMessage, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching contact message for view:', error);
        res.status(500).send('Server Error: Could not load message for viewing.');
    }
});

// Admin - DELETE Contact Message
app.delete('/admin/contact-messages/delete/:id', isAdmin, async (req, res) => {
    try {
        const contactMessage = await ContactMessage.findByIdAndDelete(req.params.id);
        if (!contactMessage) {
            return res.status(404).redirect('/admin/contact-messages?error=Message not found for deletion.');
        }
        console.log('🗑️ Contact message deleted successfully:', contactMessage._id);
        res.redirect('/admin/contact-messages?success=Message deleted successfully!');
    } catch (error) {
        console.error('❌ Error deleting contact message:', error);
        res.redirect('/admin/contact-messages?error=Failed to delete message.');
    }
});


// Admin - Vendors Management Page
app.get('/admin/vendors', isAdmin, async (req, res) => {
    try {
        const vendors = await Vendor.find({});
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_vendors', { title: 'Manage Vendors - SkillHub Admin', vendors: vendors, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching vendors for admin dashboard:', error);
        res.status(500).send('Server Error: Could not load vendors.');
    }
});

// Admin - GET Vendor Edit Form
app.get('/admin/vendors/edit/:id', isAdmin, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).render('404', { title: 'Vendor Not Found' });
        }
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        res.render('admin_vendor_edit', { title: `Edit Vendor: ${vendor.companyName}`, vendor: vendor, successMessage, errorMessage });
    } catch (error) {
        console.error('❌ Error fetching vendor for edit:', error);
        res.status(500).send('Server Error: Could not load vendor for editing.');
    }
});

// Admin - PUT (Update) Vendor
app.put('/admin/vendors/edit/:id', isAdmin, async (req, res) => {
    const { companyName, contactPerson, email, phone, serviceCategory, description, status } = req.body;
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).redirect('/admin/vendors?error=Vendor not found for update.');
        }

        if (email && email !== vendor.email) {
            const emailExists = await Vendor.findOne({ email, _id: { $ne: vendor._id } });
            if (emailExists) {
                return res.redirect(`/admin/vendors/edit/${vendor._id}?error=${encodeURIComponent('Email already in use by another vendor.')}`);
            }
        }

        vendor.companyName = companyName || vendor.companyName;
        vendor.contactPerson = contactPerson || vendor.contactPerson;
        vendor.email = email || vendor.email;
        vendor.phone = phone || vendor.phone;
        vendor.serviceCategory = serviceCategory || vendor.serviceCategory;
        vendor.description = description || vendor.description;
        vendor.status = status || vendor.status;

        await vendor.save();
        console.log('✅ Vendor updated successfully:', vendor.companyName);
        res.redirect('/admin/vendors?success=Vendor updated successfully!');

    } catch (error) {
        console.error('❌ Error updating vendor:', error);
        let errorMessage = 'Vendor update failed. Please try again.';
        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
        }
        res.redirect(`/admin/vendors/edit/${req.params.id}?error=${encodeURIComponent(errorMessage)}`);
    }
});


// Admin - PUT (Update) Vendor Status (Approve/Reject)
app.put('/admin/vendors/status/:id', isAdmin, async (req, res) => {
    const { status } = req.body;
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).redirect('/admin/vendors?error=Vendor not found for status update.');
        }

        if (!['Approved', 'Rejected', 'Pending Review'].includes(status)) {
            return res.status(400).redirect(`/admin/vendors?error=${encodeURIComponent('Invalid status provided.')}`);
        }

        vendor.status = status;
        await vendor.save();
        console.log(`✅ Vendor status updated to ${status}:`, vendor.companyName);
        res.redirect(`/admin/vendors?success=Vendor status updated to ${status}!`);

    } catch (error) {
        console.error('❌ Error updating vendor status:', error);
        res.redirect('/admin/vendors?error=Failed to update vendor status.');
    }
});


// Admin - DELETE Vendor
app.delete('/admin/vendors/delete/:id', isAdmin, async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndDelete(req.params.id);
        if (!vendor) {
            return res.status(404).redirect('/admin/vendors?error=Vendor not found for deletion.');
        }
        console.log('🗑️ Vendor deleted successfully:', vendor.companyName);
        res.redirect('/admin/vendors?success=Vendor deleted successfully!');
    } catch (error) {
        console.error('❌ Error deleting vendor:', error);
        res.redirect('/admin/vendors?error=Failed to delete vendor.');
    }
});


// Error Handling Middleware (404 Not Found pages ke liye) - MUST BE AT THE VERY END of all routes
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

// Start the server
StartServer();
