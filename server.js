var https = require('https');
var express = require('express');
var pug = require('pug');
var app = express();
var path = require('path');
var url = require('url');
var mongoose = require("mongoose");

var port = process.env.PORT || 3000;
var imgurObj = function(title, link){
    this.link = link;
    this.title = title;
};
var urlDb = "mongodb://harvey:image-search@ds145178.mlab.com:45178/image-search-layer";

// without this line, mongoose sends an error message saying that mpromise (mongoose's default promise library) is deprecated - http://mongoosejs.com/docs/promises.html
mongoose.Promise = global.Promise;

mongoose.connect(urlDb);
var ImageLayerRecord = mongoose.model('ImageLayerRecord', {term: String, when: Date});


// i use pug as a view engine
app.set("view engine", "pug");
app.set("views", "./views");

app.use(express.static(__dirname + '/public'));

//default search value is grumpy cat
app.locals.search = "grumpy%20cat";

app.get("/", function(req, res, next){
    res.render('index.pug');
    next();
});

app.use("/api/imagesearch/", function(req, res){
    app.locals.search = url.parse(req.path, true);
    app.locals.search = app.locals.search.path.slice(1);
    console.log("Search term entered in the URL: ", app.locals.search);
    
    //variable not used as Imgur's API does not have an offset query parameter
    var offset = req.query.offset || 10;
    
    var options = {
        protocol: 'https:',
        hostname: "api.imgur.com",
        path: '/3/gallery/search?q=' + app.locals.search,
        method: "GET",
        headers: {
            'Authorization': 'Client-ID e19419705fc203b'
        }
    };
    
    https.get(options, function(response){
        var d = '';
        var parsed = '';
        var r = [];
        response.setEncoding('utf8');
        response.on('data', function(chunk){
            d += chunk;
        });
        response.on("end", function(){
            parsed = JSON.parse(d);
            //send only snippet and url of each object
            parsed.data.forEach(function(el){
                var obj = new imgurObj(el.title, el.link);
                r.push(obj);
            });
            //save data to the mongodb database on mlab
            var output = new ImageLayerRecord({term: app.locals.search, when: new Date().toJSON()});
            
            output.save(function(err){
                if (err)
                    console.log(err);
                else{
                    console.log("The following search entry has been saved to the database: ", app.locals.search);
                }
                    
            });
            res.send(r);
        });
        
        response.on('error', function(){
            console.error;
            res.send("There has been an error \n\n", console.error);
            
        });
        
    }).on('error', console.error);
});

app.use("/api/latest/imagesearch", function(req, res){
   console.log("I render the 10 latest entries to the database");
   ImageLayerRecord.find({}, function(err, data){
       res.send(data);
   }).limit(10);
});


app.listen(port); 

