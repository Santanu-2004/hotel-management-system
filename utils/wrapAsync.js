//syntax 1
// const wrapAs = function wrapAsync(fn) {
//     return function(req, res, next){
//         fn(req, res, next).catch(next);
//     }
// }
// module.exports = wrapAs;

// another syntaxes : 
module.exports = (fn) => {
    return (req, res, next) => {
        fn(req,res,next).catch(next);
    }
}