var _ = require("lodash");

var rpc = {
    methodName:"rpc",
    rpcEntries:{},
    wrap:function(id, obj, whitelist, sync, data){
        if(_.isObject(id)){
            var entry = id;
            rpc.rpcEntries[entry.id] = entry;
        } else {
            rpc.rpcEntries[id] = {id:id, obj:obj, whitelist:whitelist, sync:sync, data:data};
        }
    },
    middleware:function(req, res, next){
        var urlSplit = req.url.split("/");
        //If they're not after the rpc, send them on.
        if(urlSplit[1] !== rpc.methodName){
            return next();
        }

        var id = urlSplit[2];
        var operation = urlSplit[3];
        var args = req.body;
        rpc.call(req, res, id, operation, args);
    },
    call:function(req, res, id, operation, args){
        console.log("==== Operation called with:======")
        console.log("ID:", id);
        console.log("Operation:", operation);
        console.log("Arguments:", (args && args.join && args.join()) || args);

        var obj = rpc.rpcEntries[id].obj;
        var whitelist = rpc.rpcEntries[id].whitelist;
        var data = !!rpc.rpcEntries[id].data;
        var async = !rpc.rpcEntries[id].sync;   //async will be default

        //If the arguments provided arn't in array format throw error;
        if(args && !_.isArray(args)){
            res.send(401, "The request body must be in array format");
            console.log("Error:", "Arguments not array");
            console.log("=================================");
            return;
        }

        //If they're tring to reach an rpc object that dosn't exist...
        if(!obj){
            res.send(404, "No rpc object under that id");
            console.log("Error:", "No object under that id");
            console.log("=================================");
            return;
        }

        //If they're trying to reach an operation that dosn't exist...
        if(!obj[operation]){
            res.send(404, "Operation not found");
            console.log("Error:", "Operation not found");
            console.log("=================================");
            return;
        }

        //Whitelist must be deliberatly set to false to be ignored
        //If the operation on the rpc object they're trying to reach dosn't exist...
        if(whitelist !== false && !_.includes(whitelist, operation)){
            res.send(403, "Forbidden operation");
            console.log("Error:", "Forbidden operation");
            console.log("=================================");
            return;
        }

        //If they're not targeting a value and we're cool with returning data, just send them back the whole thing.
        if(!data && !_.isFunction(obj[operation])){
            res.send(401, "The operation is not a function");
            console.log("Error:", "Operation not function");
            console.log("=================================");
            return;
        }



        //Build the list of arguments for our function. If it's syncronous, don't include callback.
        if(args){
            args = async ? args.concat([onDone, req, res]) : args.concat([req, res]);
        } else {
            args = async ? [onDone, req, res] : [req, res];
        }

        //Call our function.
        if(async){
            obj[operation].apply(obj, args);
        } else {
           try{
                var result = obj[operation].apply(obj, args);
                handleSuccess(result);
            } catch (err){
                handleFailure(err);
            }
        }

        function onDone(err, result){
            if(err){
                handleFailure(err);
            } else {
                handleSuccess(result);
            }
        }

        function handleFailure(err){
            console.log("Error:", err);
            console.log("=================================");

            if(!err.status){
                res.status(400).send({status:400, error:err});
            } else {
                res.status(err.status).send(err);
            }
        }

        function handleSuccess(result){
            console.log("Result:", result);
            console.log("=================================");
            res.status(200).send(result);
        }
    }
}

module.exports = {
    middleware:rpc.middleware,
    wrap:rpc.wrap
};