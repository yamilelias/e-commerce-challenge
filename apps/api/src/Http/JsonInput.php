<?php

declare(strict_types=1);

namespace App\Http;

use Symfony\Component\HttpFoundation\Request;

final class JsonInput
{
    /** @return array<string, mixed> */
    public function read(Request $request): array
    {
        if (!$request->headers->contains('Content-Type', 'application/json') && !str_starts_with((string) $request->headers->get('Content-Type'), 'application/json;')) {
            throw new ApiProblem(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected application/json.');
        }
        $raw = $request->getContent();
        if (strlen($raw) > 65536) {
            throw new ApiProblem(413, 'FILE_TOO_LARGE', 'Request body is too large.');
        }
        try {
            $decoded = json_decode($raw, false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ApiProblem(400, 'BAD_JSON', 'Malformed JSON request.');
        }
        if (!$decoded instanceof \stdClass) {
            throw new ApiProblem(400, 'BAD_JSON', 'JSON request must be an object.');
        }

        return json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    }
}
