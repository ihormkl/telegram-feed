// -----------------------------------------------------------------------------
// settings

// channels to stream
var channels = ['durov', 'EnglishByNinaKarami', 'EspressoEnglish', 'SpaceX',
  'teslamotorsuk'];
// the amount of messages loaded on the beginning and on the user request
var loadLimit = 7;


// -----------------------------------------------------------------------------
// functions

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
      var vd = document.implementation.createHTMLDocument('virtual');
      var post = $(msgBox, vd).find("a.tgme_widget_message_date").attr("href");
      post = post.substring(post.lastIndexOf(channels[mi]));
      return {
        datetime : $(msgBox, vd).find(".tgme_widget_message_info time").attr("datetime"),
        post : post
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
    // in case of WordPress we can use the WP telegram join
    // plugin with ajax widget - it provides its own (proxy) url for getting
    // telegram embed feed
    var url = "/tg-proxy.php?channel=" + channel;
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
      var vd = document.implementation.createHTMLDocument('virtual');
      var channelDone = this;
      console.log("done " + channelDone);
      data[channelDone] = $(response, vd).find("[data-post]").parent();
      latest[channelDone] = $(response, vd).find("[data-post]").attr("data-post");
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

  // place messages using the telegram embed script
  // (another option is to place the message itself, from the 'messages' map 'data' field)
  var li = 0;
  for(li = loaded; li < loaded + loadLimit; li++) {
    var postFrame = $('<iframe id="telegram-post-' + messages[li].post.replace(/[^a-z0-9_]/ig, '-') + '"'
      + ' src="/tg-proxy.php?post=' + messages[li].post + '"'
      + ' width="100%" height frameborder="0" scrolling="no" style="border: none; overflow: hidden; min-width: 320px" />');
    postFrame.on("load", function(e) {
      showMessageBox(e.target);
      $(".lds-ellipsis").dequeue('messages');
    });
    var fbFrame = '<iframe src="https://www.facebook.com/plugins/share_button.php?href='
            + encodeURIComponent('https://t.me/'+messages[li].post)
            + '&layout=button&size=small&width=96&height=20" width="96" height="20" style="border:none;overflow:hidden;width:102px;float:right;margin-bottom:8px" scrolling="no" frameborder="0" allowTransparency="true" allow="encrypted-media"></iframe>';
    var msgBox = $('<div id="message-box-' + messages[li].post + '" style="display:none;width:100%;overflow:hidden"></div>');
    msgBox.append(postFrame, fbFrame);
    enqueueMessageBox(msgBox);
  }
  loaded = li;

  $(".lds-ellipsis").dequeue('messages');
}

function enqueueMessageBox(messageBox) {
  $(".lds-ellipsis").queue('messages', function() {
    $(".lds-ellipsis").before(messageBox);
  });
}

var messagesShown = 0;
function showMessageBox(msgIframe) {
  $(msgIframe).parent().show();
  msgIframe.style.height = msgIframe.contentWindow.document.documentElement.scrollHeight + 'px';
  if(++messagesShown == loaded) {
    $(".lds-ellipsis").remove();
    // unlock button
    loading = false;
    $(".more a").show();
  }
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
      $moreBtn.hide();
      placeMessages();
      return false;
    });
    $moreBtn.click();
  });
}
