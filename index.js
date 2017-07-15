var fs = require("fs"),
	cheerio = require("cheerio"),
	request = require("request"),
	_ = require("underscore");

var out = [];

_.rateLimit = function(func, rate, async) {
  var queue = [];
  var timeOutRef = false;
  var currentlyEmptyingQueue = false;
  
  var emptyQueue = function() {
    if (queue.length) {
      currentlyEmptyingQueue = true;
      _.delay(function() {
        if (async) {
          _.defer(function() { queue.shift().call(); });
        } else {
          queue.shift().call();
        }
        emptyQueue();
      }, rate);
    } else {
      currentlyEmptyingQueue = false;
    }
  };
  
  return function() {
    var args = _.map(arguments, function(e) { return e; }); // get arguments into an array
    queue.push( _.bind.apply(this, [func, this].concat(args)) ); // call apply so that we can pass in arguments as parameters as opposed to an array
    if (!currentlyEmptyingQueue) { emptyQueue(); }
  };
};

var get_limited = _.rateLimit(get, 1000);

for (var i = 0; i < 9470; i++){
	get_limited(i);
}

function get(i){

	var page = i == 0 ? "" : "page_" + i;

	request("http://gawker.com/" + page, function(error, response, body){

		if (!error && response.statusCode == 200){
		
			var $ = cheerio.load(body);
	
			$(".main").find("article").each(function(article_index, article){
	
				var obj = {};
				obj.headline = $(article).find("h1").text().trim();
				obj.url = "http://gawker.com" + $(article).find("h1").find("a").attr("href");
				
				var clone = $(article).find("header").clone();
				clone.find("h1").remove();
				var dek = clone.text().trim();
				var dek_split = dek.split(" · ");
				obj.author = dek_split[0];
				var date_time = dek_split[1];
				var date_time_split = date_time.split(" ");
				obj.date = date_time_split[0];
				obj.time = date_time_split[1];
				var date_split = obj.date.split("/");
				obj.month = date_split[0];
				obj.day = date_split[1];
				obj.year = date_split[2];

				obj.post_excerpt = $(article).find(".post-excerpt").text().trim();

				out.push(obj);
				fs.writeFileSync("data/gawker_posts.json", JSON.stringify(out));
				console.log((((i + 1) / 9469) * 100).toFixed(2) + "%");
	
			});
		} else {
			console.log("Error in request: " + page)
		}


	});
}