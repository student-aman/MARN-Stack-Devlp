// controllers/homeControllers.js
exports.getHomePage = (req, res) => {
    const currentUser = null; // ya koi dummy user object
    res.render('home', {
        title: 'SkillHub - Find Trusted Local Services',
        currentUser: currentUser
    });
};