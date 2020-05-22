const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const session = require('express-session')
const readChunk = require('read-chunk')
const fileType = require('file-type')
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const jimp = require("jimp");

app.use(bodyParser.urlencoded({ extended: false }))
 
app.use(bodyParser.json())

const storage = multer.diskStorage({
    destination : "./public/images/fullsize",
    filename: function (req, file, cb) {
      crypto.pseudoRandomBytes(16, function (err, raw) {
        if (err) return cb(err)
  
        cb(null, raw.toString('hex') + path.extname(file.originalname))
      })
    }
  })

const upload = multer({storage : storage });




app.use(session({
    secret: "kissakala",
    resave : false,
    saveUninitialized : true
}))

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://192.168.1.102:4200");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    next();
  });

const objectdatabase = require("./models/ObjectDatabase");

const validatePayloadMiddleware = (req, res, next) => {
    if(req.body){
        next();
    }
    else{
        res.status(403).send({
            errorMessage : 'you need a payload'
        })
    }
}

app.get("/username", (req,res) => {
    if(req.session.user){
        return req.session.user;
    }
    else{
        return "";
    }
})

app.post("/changeitem", (req, res) => {
    if(req.session.user){
        newItem = {
            "_id" : req.body.id,
            "data": {
                $set : {
                    "description" : req.body.Description,
                    "dateModified": Date(req.body.DateModified),
                    "taken" : req.body.taken,
                    "takenBy" : req.body.takenBy
                }
            }
            
        }
        objectdatabase.UpdateItem(newItem, (data) => {
            res.send(data);
        })
        console.log(newItem)
    }
})

app.post("/newuser", (req, res) => {
    crypto.pbkdf2(req.body.pass, 'salt', 100000, 64, 'sha256', (err, derivedKey) => {
        newUser = {
            "user" : req.body.user,
            "pass" : new Buffer(derivedKey, 'binary').toString('base64')
        }
        objectdatabase.AddUser(newUser, (data) => {
            res.send(data);
        })
    });
    
})

app.post("/newitem", (req, res) => {
    if(req.session.user){
        objectdatabase.GetMaxId((data) => {
            newItem = {
                "_id" : 1,
                "name" : req.body.name,
                "tags" : req.body.tags,
                "dateModified" : new Date(req.body.DateModified),
                "dateAdded" : new Date(req.body.DateAdded),
                "description" : req.body.Description,
                "image" : req.body.imageUrl,
                "taken" : false,
                "takenBy" : ""
            }
            if(data._id){
                newItem._id = (data[0]._id+1)
            }
            
            objectdatabase.AddItem(newItem, (data) => {
                res.send(data);
            })
        });
    }
})

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if(err){
            res.status(500).send('Could not log out.');
        }
        else{
            res.status(200).send({});
        }
    })
})

app.get("/login", (req, res) => {
    req.session.user ? res.status(200).send({loggedIn : true, user : req.session.user}) : res.status(200).send({loggedIn : false});
})

app.post("/login", validatePayloadMiddleware, (req,res) => {
    if(req.body.username){
        crypto.pbkdf2(req.body.password, 'salt', 100000, 64, 'sha256', (err, derivedKey) => {
            testPassword = new Buffer(derivedKey, 'binary').toString('base64')
            objectdatabase.GetUser(req.body.username, (data) => {
                if(testPassword === data[0].pass){
                    req.session.user = data[0].user;
                    res.status(200).send({
                        user : data[0].user
                    });
                }
                else{
                    res.status(403).send({
                        errorMessage : 'Permission denied'
                    })
                }
            });
        })
    }
    
})

app.get("/uploads/:id", (req, res) => {
    if(req.session.user){
        var id = req.params.id;
        res.sendFile(__dirname+"/public/images/resized/"+id)
    }
    else{
        res.status(403).send("You need an active session to do this");
    }
});

app.post("/resize", upload.single("File"), (req, res) =>{
    if(req.session.user){
        if(req.file){
            let chunk = readChunk.sync(__dirname+"/public/images/fullsize/"+req.file.filename, 0, 4100)
            let myFileType = fileType(chunk);
            if(myFileType.ext == "jpg" || myFileType.ext == "jpeg" || myFileType.ext == "png"){
                jimp.read(__dirname+"/public/images/fullsize/"+req.file.filename).then(image => {
                    image.exifRotate().resize(800, jimp.AUTO)
                        .write(__dirname+"/public/images/resized/"+req.file.filename)
                        
                });
                setTimeout(() => {
                    fs.unlink(__dirname+"/public/images/fullsize/"+req.file.filename);
                    res.json({"name": req.file.filename})
                }, 500);
            }
            else{
                fs.unlink(__dirname+"/public/images/fullsize/"+req.file.filename);
                let ip = req.connection.remoteAddress;
                if (ip.substr(0, 7) == "::ffff:") {
                    ip = ip.substr(7)
                }
                fs.appendFile("log.txt", ip+"\n", (err) => {
                    if(err) throw err;
                    console.log("Saved!");
                })
                console.log(ip+" sent a wrong file type, BANNED")
                res.send("Thank you, Goodbye!");
            }
        
        }
        else{
            let ip = req.connection.remoteAddress;
            if (ip.substr(0, 7) == "::ffff:") {
                ip = ip.substr(7)
            }
            fs.appendFile("log.txt", ip+"\n", (err) => {
                if(err) throw err;
                console.log("Saved!");
            })
            console.log(ip+" sent a wrong file type, BANNED")
            res.send("Thank you, Goodbye!");
        }
    }
    else{
        res.status(403).send("You need an active session to do this");
    }
})

app.post("/photos", upload.single("File"), (req, res) => {
    console.log("Recieved image ", req.file)
})

app.get("/items", (req, res) => {
    if(req.session.user){
        objectdatabase.GetItems((data) => {
            res.json(data);
        });
    }
    else{
        res.status(403).send('You need to log in to do this');
    }
});

app.listen(3000, () => {
    console.log("Server successfully powered on!")
})