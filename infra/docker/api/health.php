<?php

$context = stream_context_create(['http' => ['timeout' => 3, 'ignore_errors' => true]]);
$body = @file_get_contents('http://127.0.0.1:8000/api/v1/health', false, $context);
$status = $http_response_header[0] ?? '';
exit($body !== false && preg_match('~^HTTP/\S+ 200(?: |$)~', $status) ? 0 : 1);
