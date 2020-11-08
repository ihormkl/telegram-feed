<?php
$channel = filter_input(INPUT_GET, 'channel', FILTER_SANITIZE_URL);
$post = filter_input(INPUT_GET, 'post', FILTER_SANITIZE_URL);
if(!isset($channel) && !isset($post)) {
 return;
}
$opts = array('http' =>
    array(
        'method'  => 'GET',
        'user_agent '  => "Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.2) Gecko/20100301 Ubuntu/9.10 (karmic) Firefox/3.6",
        'header' => array(
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*\/*;q=0.8'
        ),
    )
);
$context  = stream_context_create($opts);
try {
  $url = isset($channel) ? "https://telegram.me/s/$channel" : "https://t.me/$post?embed=1";
  $content = @file_get_contents($url, false, $context);
  if ($content === false) {
    return;
  }
} catch (Exception $e) {
  return;
}

echo $content;
