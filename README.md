# Rpcify
A niffty express middleware to make your object functions accessible over http.

##Installation

```
    npm install rpcify
```

##Basic Usage

```javascript
var express = require('express');
var rpcify = require('rpcify');   //Require the package
var fs = require('fs');
var app = express();

app.use(rpcify.middleware);    //Tell express to use our middleware

rpcify.wrap({id:"fs", obj:fs, whitelist:["mkdir"]});   //Wrap the object
//or
rpcify.wrap("fs", fs, ["mkdir"]);

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
```

```javascript
//Then, from anywhere, just pop off a request to {address}/rpc/{id}/{operation}
//Make sure to include a list of arguments (minus the callback) as an array.
$http.post("http://localhost:3000/rpc/fs/mkdir", ["/sweet!"])
.success(function(){
    console.log("Directory creation success!");
}).error(function(err){
    console.log("Oh no, and error occured!", err);
});
```

##Under the hood

Any function called by the rpc relay will be called using the provided arguments array with the callback, request and response appended. The object with be set as the context

```javascript
    $http.post(address + "/rpc/theid/say", ["Hello", "Bobby"])
    .success(console.log.bind(console)) //Everything went swimmingly!
    .error(console.log.bind(console)); //{status:418, err:"This api hates life and it wants me to hate it too."}
```
and then on the server side
```javascript
var rpcify = require("rpcify");

var obj = {
    someData:"Stuff",
    say:function(message, name, callback, req, res){
        console.log(message, name) //"Hello" "Bobby"
        console.log(this.someData) //"Stuff"
        someAsyncFunction(function(err){
            if(err){
                callback({status:418, err:"This api hates life and it wants me to hate it too."});
            } else {
                callback(null, "Everything went swimmingly!");
            }
        })
    }
}

rpcify.wrap("theid", obj, false); //If false is set as the whitelist, everything is allowed
```

As per standard node convention, if the callback is invoked with a truthy value for the first element, it will treat it as the error. If you control what's getting passed back, then passing an object with {status:418, error:"Flux overflow"}, will set the http status code to 418. Otherwise, if there's an error and no status code provided, it wil default to 400.

##Sync
If you're unusually lucky, and you only need to hit syncronous server side functions, you can use:

```javascript
rpcify.wrap({id:"theid", obj:obj, whitelist:false, async:false});
//or
rpcify.wrap("theid", obj, false, false);

//and our say function becomes:
say:function(message, name, req, res){
    console.log(message, name) //"Hello" "Bobby"
    console.log(this.someData) //"Stuff"
    var result = someSyncFunction();

    if(!result){
        throw new Error({status:418, err:"This api hates life and it wants me to hate it too."});
    } else {
        return "Everything went swimmingly!";
    }
}
```

The function will be called with a standard try catch, and the callback won't be passed.

##Data
If you also want to be able to hit the data on your objects (although at this point, I don't know why you wouldn't just have it client side. But hey, there's unexpected use cases for everything).

```javascript
rpcify.wrap({id:"theid", obj:obj, whitelist:false, async:true, data:true});
//or
rpcify.wrap("theid", obj, true, true);

$http.post(address + "/rpc/theid/someData")
.success(console.log.bind(console))         //"Stuff"
```