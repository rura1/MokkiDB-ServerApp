mongodb = require("mongodb");
MongoClient = mongodb.MongoClient;

let db;

MongoClient.connect("mongodb://localhost:27017/", (err, connection) => {
    if(err){
        console.log("Error connecting to MongoDB-database")
    }
    else{
        db = connection.db("objectlist");
        console.log("Successfully connected to the MongoDB-database");
    }
});

module.exports = {
    "UpdateItem" : (data, callback) => {
        console.log(data._id)
        db.collection("objects").updateOne({ "_id" : data._id}, data.data, (err, result) => {
            callback(result)
        })
    },
    "GetItems" : (callback) => {
        db.collection("objects").find().toArray((err, result) => {
            callback(result);
        });
    },
    "GetUser" : (user, callback) => {
        db.collection("users").find({"user" : user}).toArray((err, result) => {
            callback(result);
        });
    },
    "AddItem" : (data, callback) => {
        db.collection("objects").insertOne(data, (err, res) => {
            if(err) throw err;
            console.log("1 document inserted");
        })
    },
    "GetMaxId" : (callback) => {
        db.collection("objects").find().sort({_id:-1}).limit(1). toArray((err, result) => {
            callback(result)
        })
    },
    "AddUser" : (user, callback) => {
        db.collection("users").find({"user" : user.user}).toArray((err, result) => {
            if(result){
                callback("This username is already taken")
            }
            else{
                db.collection("users").insertOne(user, (err, res) => {
                    if(err) throw err;
                    console.log("1 user inserted");
                });
            }
        });
        
    }
};