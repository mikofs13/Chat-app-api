module.exports = logger =  (req,res,next) => {
    console.log("\t" + req.method, "\t" + req.url);

    next()


}

