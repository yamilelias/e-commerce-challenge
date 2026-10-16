<?php

$context = stream_context_create(['http' => ['timeout' => 3, 'ignore_errors' => true]]);
$body = @file_get_contents('http://127.0.0.1:8000/api/v1/health', false, $context);
$status = $http_response_header[0] ?? '';
$payload = $body === false ? null : json_decode($body, true);
exit(
    preg_match('~^HTTP/\S+ 200(?: |$)~', $status)
    && ($payload['data']['status'] ?? null) === 'ok'
    && ($payload['data']['database'] ?? null) === 'ok'
        ? 0
        : 1
);
