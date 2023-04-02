const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const _ = require('lodash');
const flash = require('connect-flash');
const session = require('express-session');

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

const sessionConfig = {
  name: 'session',
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie : {
    httpOnly: true,
    // secure: true,
    expires: Date.now() + 1000*60*60*24*7,
    maxAge: 1000*60*60*24*7
  }
}

app.use(session(sessionConfig));
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
})

mongoose.connect("mongodb://localhost:27017/todolistDB", {
  useNewUrlParser: true
});

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to To-Do list"
});

const item2 = new Item({
  name: "Click + to add new lists"
});

const item3 = new Item({
  name: "<-- Click on the checkbox to delete item"
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

app.get("/", (req, res) => {
  Item.find({}, function(err, foundItems) {
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved default items to DB.")
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Today",
        newList: foundItems
      });
    }

  });

});

app.get("/:customListName", (req, res) => {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName}, (err, foundItems) => {
    if (!foundItems) {
      const list = new List({
        name: customListName,
        items: []
      });
      list.save();
      res.redirect("/" + customListName);
    } else {
      res.render("list", {
        listTitle: foundItems.name,
        newList: foundItems.items
      });
    }
  });

});



app.post("/", (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  if(itemName.length === 0){
    req.flash('error', 'Item cannot be empty');
    if(listName === "Today")
    return res.redirect('/');
    else
    return res.redirect('/'+listName);
  }
  const newItem = new Item({
    name: itemName
  });

  if (listName == "Today") {
    newItem.save();
    res.redirect("/");
  }
  else {
    List.findOne({name: listName}, (err, foundItems) => {
      foundItems.items.push(newItem);
      foundItems.save();
      res.redirect("/" + listName);
    })
  }
});

app.post("/delete", (req, res) => {
  const checkedID = req.body.checkbox;
  const listName = req.body.listTitle;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedID, (err) => {
      if (!err) {
        console.log("Successfully deleted item");
        res.redirect("/");
      }
    });
  }
  else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedID}}}, (err, foundItems) => {
      if (!err) {
        res.redirect("/" + listName);
      }
    })
  }

})


app.listen(3000, () => {
  console.log("Server started on port 3000");
});
