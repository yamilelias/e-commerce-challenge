<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class ReceiptTokenService
{
    public function __construct(#[Autowire('%env(RECEIPT_SECRET)%')] private readonly string $secret)
    {
        if (strlen($secret) < 32) {
            throw new \RuntimeException('RECEIPT_SECRET must contain at least 32 bytes.');
        }
    }

    public function derive(string $normalizedIdempotencyKey): string
    {
        return hash_hmac('sha256', 'receipt:v1:'.$normalizedIdempotencyKey, $this->secret);
    }

    public function hash(string $token): string
    {
        return hash('sha256', $token);
    }
}
