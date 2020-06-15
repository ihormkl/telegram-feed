// -----------------------------------------------------------------------------
// settings

// channels to stream
var channels = ['durov', 'EnglishByNinaKarami', 'EspressoEnglish', 'SpaceX',
  'teslamotorsuk'];
// the amount of messages loaded on the beginning and on the user request
var loadLimit = 7;

// -----------------------------------------------------------------------------
// functions

// small crutch to make WP with Elementor to load the script
var $ = (typeof $ === 'undefined') ? window.jQuery : $;

// TODO: new messages check
// TODO: add fail check when happens error response from some channel

var latest = {};
var data = {};
var messages = [];

// pick up messages from channels to a single container and
// sort them by datetime (newest - first)
var gatherAndSortMessages = function() {
  console.log("gatherAndSortMessages");
  var mi;
  for(mi = 0; mi < channels.length; mi++) {
    console.log("gatherAndSortMessages " + channels[mi]);
    messages = messages.concat($.map(data[channels[mi]], function(msgBox) {
      return {
        datetime : $(msgBox).find("time").attr("datetime"),
        post : $(msgBox).find("[data-post]").attr("data-post"),
        data : msgBox
      };
    }));
  }
  messages.sort(function(a, b) {
    return (a.datetime > b.datetime ? 1 : a.datetime < b.datetime ? -1 : 0) * -1;
  });
  console.log(messages);
}

var getting = false;
var getMessages = function(channels, callback) {
  if (getting) return;
  getting = true;
  var i;
  for(i = 0; i < channels.length; i++) {
    var channel = channels[i];
    console.log("getting " + channel);
    // TODO: improvement - in case of WordPress we can use the WP telegram join
    // plugin with ajax widget - it provides its own (proxy) url for getting
    // telegram embed feed
    var url = "https://cors-anywhere.herokuapp.com/https://telegram.me/s/" + channel;
    if (latest[channel]) {
      url += "?before=" + latest[channel]
    }
    console.log(url);
    var doneCount = 0;
    $.ajax({
      url: url,
      type: "GET",
      crossDomain: true
    })
    .done(function (response) {
      var channelDone = this;
      console.log("done " + channelDone);
      data[channelDone] = $(response).find("[data-post]").parent();
      latest[channelDone] = $(response).find("[data-post]").attr("data-post");
      latest[channelDone] = latest[channelDone].substr(latest[channelDone].lastIndexOf("/") + 1);
      doneCount++;
    }.bind(channel))
    .fail(function (xhr, status) {
      console.log("error with " + channel);
    })
    .always(function() {
      console.log("always " + doneCount);
      // gather loaded messages and sort by datetime
      if (doneCount == channels.length) {
        getting = false;
        doneCount = 0;
        gatherAndSortMessages();
        callback();
      }
    });
  }
};

var loaded = 0;
var loading = false;
// load messages from telegram and place them on the page
// when there are no messages this functions calls 'getMessages' to load more of them,
// and places itself as a callback with 'fromCallback' set to 'true' - a way to skip
// 'is loading' check and continue to placing.
var placeMessages = function(fromCallback) {
  if (!fromCallback) {
    if (loading) return;
    // lock button
    loading = true;
    // using pure css loaders - https://loading.io/css/
    $(".js-feed").append('<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>');
  }

  // if there are less messages than the overall requested amount - load more messages,
  // place itself as a callback with 'fromCallback' set to 'true'
  // to skip 'is loading' check and continue to placing.
  if (messages.length < loaded + loadLimit) {
    getMessages(channels, function() { placeMessages(true); });
    return;
  }

  // TODO scroll to js-feedl "bottom" before loader icon or minus its height
  // the '*loaded/loaded' math trick belowe - to prevent scrolling on the page load
  $([document.documentElement, document.body]).animate({
      scrollTop: ($('.lds-ellipsis').offset().top - 40)*loaded/loaded
  }, 1000);

  // place messages using the telegram embed script
  // (another option is to place the message itself, from the 'messages' map 'data' field)
  var li = 0;
  for(li = loaded; li < loaded + loadLimit; li++) {
    $(".lds-ellipsis").before('<script async src="https://telegram.org/js/telegram-widget.js?9" data-telegram-post="'
     + messages[li].post + '" data-width="100%"></' + 'script>'); // split with + so this code can be pasted in the WP editor
  }
  loaded = li;
  $(".lds-ellipsis").remove();
  // unlock button
  loading = false;
}

// -----------------------------------------------------------------------------
// loader

// in case the jQuery is late
window.onload = function() {
  $ = (typeof $ === 'undefined') ? window.jQuery : $;
  $( document ).ready(function() {
    $(".js-feed").empty();
    // only for debug - on the production - seprarately add .more button on the page
    // $(".more").remove();
    // if (!$.contains(document, $(".more"))) {
    //   $(".js-feed").after('<div class="more">MORE !!!</div>');
    // }

    var $moreBtn = $(".more a");
    $moreBtn.off();
    $moreBtn.click(function() {
      placeMessages();
      $moreBtn.blur();
      return false;
    });
    $moreBtn.click();
  });
}
