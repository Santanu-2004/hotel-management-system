if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const Listing = require("./models/listing.js");
const Review = require("./models/reviews.js");
const User = require("./models/user.js");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema, reviewSchema} = require("./schema.js");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
console.log(MongoStore);
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const {isLoggedIn, saveRedirectUrl, validateListing, validateReview} = require("./middleware.js");
const multer = require("multer");
const {storage} = require("./cloudConfig.js");
const upload = multer({storage});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);

const store = MongoStore.create({
    mongoUrl: process.env.ATLAS_URL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", () => {
    console.log("SESSION STORE ERROR");
});

const sessionOptions = {
    store,
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAge :  7 * 24 * 60* 60* 1000,
        httpOnly : true,
    },
};

app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});


const dbUrl = process.env.ATLAS_URL;

main().then(() => {
    console.log("connected successfully");
}).catch((err) => {
    console.log(err);
})

async function main() {
    // await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');
    await mongoose.connect(dbUrl);
}

//schema validation middlewares
// const validateListing = (req,res,next) =>{
//     let {error} = listingSchema.validate(req.body);
//     if(error){
//         throw new ExpressError(400, error);
//     }else{
//         next();
//     }
// }

// const validateReview = (req,res,next) =>{
//     let {error} = reviewSchema.validate(req.body);
//     if(error){
//         throw new ExpressError(400, error);
//     }else{
//         next();
//     }
// }

//login validator middleware
// function isLoggedIn(req, res, next) {
//     if (!req.isAuthenticated()) {
//         req.flash("error", "You need to login first.");
//         return res.redirect("/login");
//     }
//     next();
// };

//Server checking route
app.get("/", (req, res) => {
    res.redirect("/home");
})

//index or home route
app.get("/home", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("./listings/home.ejs", { allListings });
}));

//create new listing
app.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("./listings/newListing.ejs");
})

//create new data/listing - old vesion of req.body;
// app.post("/listings/new", 
//     validateListing,
//     wrapAsync(async(req, res) => {
//     let { title, description, image, price, country, address } = req.body;

//     let newListing = new Listing({
//         title: title,
//         description: description,
//         image: image,
//         price: price,
//         country: country,
//         address: address,
//     })
//     newListing.owner = req.user._id;
//     await newListing.save();
//     req.flash("success", "new listing added successfully!");
//     res.redirect("/home");
// }));

//create new data/listing
app.post("/listings/new", 
    upload.single("listing[image]"),
    validateListing,
    // upload.single("listing[image]"), (req,res) => {
    //     res.send(req.file);
    // }
    wrapAsync(async(req, res) => {
    let url = req.file.path;
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = url;
    await newListing.save();
    req.flash("success", "new listing added successfully!");
    res.redirect("/home");
}));


//show route : shows indevidual entity
app.get("/listings/:id",wrapAsync( async (req, res, next) => {
    try {
        let { id } = req.params;
        const listing = await Listing.findById(id)
        .populate({
            path : "reviews", 
            populate : {
               path :"author",
            },
        })
        .populate("owner");
        res.render("listings/show.ejs", { listing });
    }catch(err){
        next(err);
    }
}))

//edit route
app.get("/listings/:id/edit",isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const oldListing = await Listing.findById(id);
    res.render("listings/edit.ejs", { oldListing });
}))

//upadte Route
app.put("/listings/:id",validateListing, wrapAsync( async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    res.redirect("/home");
}))

//delete route
app.delete("/listings/:id",isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/home");
}))



//Review Part
//create review
app.post("/listings/:id/reviews",isLoggedIn,validateReview, wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    res.redirect(`/listings/${listing._id}`);
}));

//delete a review 
app.delete("/listings/:id/reviews/:reviewId",
    isLoggedIn, 
    wrapAsync(async (req,res) => {
    let {id, reviewId} = req.params;
    await Listing.findByIdAndUpdate(id, {$pull : {reviews : reviewId}});
    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/listings/${id}`);
}));




//user part
//sign-up
app.get("/signup", (req, res)=> {
    res.render("users/signup.ejs");
});

//normal sign up
// app.post("/signup", wrapAsync(async(req,res) => {
//     try{
//     let {username, email, password} = req.body;
//     const newUser = new User({username, email});
//     const regsisterUser = await User.register(newUser, password);
//     console.log(regsisterUser);
//     res.redirect("/home");
//     }catch(err){
//         req.flash("error", err.message);
//         res.redirect("/signup");
//     }
// }));


//login just after sign up
app.post("/signup", wrapAsync(async(req,res) => {
    try{
    let {username, email, password} = req.body;
    const newUser = new User({username, email});
    const regsisterUser = await User.register(newUser, password);
    req.login(regsisterUser, (err) => {
        if(err){
            next(err);
        }
        req.flash("success", "you are successfully logged in to wonderlust !");
        res.redirect("/home");
    })
    }catch(err){
        req.flash("error", err.message);
        res.redirect("/signup");
    }
}));


// //login
// app.get("/login", (req, res)=> {
//     res.render("users/login.ejs");
// });

// app.post("/login", 
//     passport.authenticate("local", 
//     { failureRedirect: "/login", failureFlash: true }),
//     async(req, res) => {
//         req.flash("success", "Welcome to WanderLust!");
//         res.redirect("/home");
// } );

//login
app.get("/login", (req, res)=> {
    res.render("users/login.ejs");
});

app.post("/login", 
    saveRedirectUrl,
    passport.authenticate("local", 
    { failureRedirect: "/login", failureFlash: true }),
    async(req, res) => {
        req.flash("success", "Welcome to WanderLust!");
        let redirectUrl = res.locals.redirectUrl || "/home";
        res.redirect(redirectUrl);
} );

//logout
app.get("/logout", (req,res)=> {
    req.logout((err)=> {
        if(err){
            return next(err);
        }
        req.flash("success", "logged out successfully!");
        res.redirect("/home");
    })
})

// booking handel part
app.get(
    "/listings/:id/book",
    isLoggedIn,
    (req, res) => {
        res.render("booking/book.ejs");
    }
);

//testing inputs
// app.get("/testing", (req,res) => {
//     let listing1 = new Listing({
//         title : "Ozen by the lake",
//         description : "Feel the Luxuary",
//         price : 8000,
//         address : "Newtown, Kolkata",
//         country : "India"
//     });

//     listing1.save();
//     console.log("value saved");
//     res.send("value added");
// })

app.all("/{*any}",(req,res,next) => {
    next(new ExpressError(404, "Page Not Found"));
})

//handel error
app.use((err,req,res,next) =>{
    let {statusCode = 500, message="Something Went Wrong"} = err;
    res.status(statusCode).render("error.ejs", {err});
});


app.listen(8080, () => {
    console.log("server is running at 8080");
})


