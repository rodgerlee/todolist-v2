//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash")
const moment = require("moment")

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// mongoose.connect("mongodb://localhost:27017/todolistDB",{useNewUrlParser: true, useUnifiedTopology: true})
mongoose.connect("mongodb+srv://test123:test123@cluster0.rrwwt.mongodb.net/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true})

const itemsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
})

const Item = mongoose.model("Item", itemsSchema)

const listSchema = {
  name: String, 
  items: [itemsSchema]
}

const List = mongoose.model("List", listSchema)

const day = moment().format("dddd, MMMM Do")

app.get("/", function(req, res) {
  
  List.find({}, function(err, otherLists){
    Item.find({}, function(err, results){
        res.render("list", {listTitle: day, newListItems: results, otherLists: otherLists});
    })
  })
  
});

app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName) 

  List.find({}, function(err, otherLists){
    List.findOne({name: customListName}, function(err, foundList){
      if (!err) {
        if (!foundList) {
          //create a new list
          const list = new List({
            name: customListName,
          })
          list.save();
          res.redirect("/" + customListName)
        } else {
          //show an existing list
          res.render("list", {listTitle: foundList.name, newListItems: foundList.items, otherLists: otherLists})
        }
      } 
    })
  })

  console.log(req.params.customListName)
})

app.post("/", function(req, res){
  const listName = req.body.list
  const itemName = req.body.newItem

  const item = new Item({
    name: itemName
  })

  if (listName === day) {
    item.save()
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item)
      foundList.save()
      res.redirect("/" + listName)
    })
  }
});

app.post("/newList", function(req, res){
  const newListTitle = req.body.newListTitle

  res.redirect("/" + newListTitle)
})

app.post("/delete", function(req, res){
  
  const id = req.body.checkbox
  const listName = req.body.listName

  if (listName === day) {
    Item.findByIdAndRemove(id, function(err){
      if (err) {
        console.log(err)
      } else {
        console.log("successfully removed")
      }
    })
    res.redirect("/")
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: id}}}, function(err, foundList){
      if (!err) {
        res.redirect("/" + listName)
      }
    })
  }
});

app.post("/deleteList", function(req, res){
  
  const listID = req.body.listID
  console.log(listID)

  List.findOneAndRemove({_id: listID}, function(err){
    if (err){
      console.log(err)
    } else {
      console.log("successfully removed list")
      res.redirect("/")
    }
  })

  
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully");
});
