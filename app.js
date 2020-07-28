//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash")

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://test123:test123@cluster0.rrwwt.mongodb.net/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true})

const itemsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
})

const Item = mongoose.model("Item", itemsSchema)

const item1 = new Item ({
  name: "make noodles"
})

const item2 = new Item ({
  name: "finish udemy"
})

const item3 = new Item ({
  name: "workout at 5PM"
})

const defaultItems = [item1, item2, item3]

const listSchema = {
  name: String, 
  items: [itemsSchema]
}

const List = mongoose.model("List", listSchema)

const day = date.getDate();

app.get("/", function(req, res) {
  
  List.find({}, function(err, otherLists){
    Item.find({}, function(err, results){
      if (results.length === 0) {
        Item.insertMany(defaultItems, function(err){
          if (err) {
            console.log(err)
          } else {
            console.log("success")
          }
        })
        res.redirect("/")
      } else {
        res.render("list", {listTitle: day, newListItems: results, otherLists: otherLists});
      }
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
            // items: defaultItems
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

app.post("/newList", function(req, res){
  const newListTitle = req.body.newListTitle

  res.redirect("/" + newListTitle)
})


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
