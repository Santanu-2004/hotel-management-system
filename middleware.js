//check and verefy if a user is loged in -> old method

// module.exports.isLoggedIn = (req,res,next) => {
//     if (!req.isAuthenticated()) {
//         req.flash("error", "You need to login first.");
//         return res.redirect("/login");
//     }
//     next();
// }

//check and redirect to new-listing or edit etc -> advanced one 

const {listingSchema, reviewSchema} = require("./schema.js");


module.exports.isLoggedIn = (req,res,next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You need to login first.");
        return res.redirect("/login");
    }
    next();
}


module.exports.saveRedirectUrl = (req,res,next) => {
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}

module.exports.validateListing = (req,res,next) =>{
    let {error} = listingSchema.validate(req.body);
    if(error){
        throw new ExpressError(400, error);
    }else{
        next();
    }
}

module.exports.validateReview = (req,res,next) =>{
    let {error} = reviewSchema.validate(req.body);
    if(error){
        throw new ExpressError(400, error);
    }else{
        next();
    }
}