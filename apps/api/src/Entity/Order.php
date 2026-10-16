<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'orders')]
#[ORM\UniqueConstraint(name: 'UNIQ_ORDERS_REFERENCE', columns: ['reference'])]
#[ORM\UniqueConstraint(name: 'UNIQ_ORDERS_IDEMPOTENCY_KEY', columns: ['idempotency_key'])]
#[ORM\UniqueConstraint(name: 'UNIQ_ORDERS_RECEIPT_TOKEN_HASH', columns: ['receipt_token_hash'])]
class Order
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(length: 40)]
    public string $reference;

    #[ORM\Column(name: 'buyer_name', length: 200)]
    public string $buyerName;

    #[ORM\Column(name: 'buyer_email', length: 254)]
    public string $buyerEmail;

    #[ORM\Column(length: 16)]
    public string $status;

    #[ORM\Column(length: 3, options: ['default' => 'USD'])]
    public string $currency = 'USD';

    #[ORM\Column(name: 'total_cents', type: 'integer')]
    public int $totalCents;

    #[ORM\Column(name: 'idempotency_key', length: 100)]
    public string $idempotencyKey;

    #[ORM\Column(name: 'request_fingerprint', length: 64)]
    public string $requestFingerprint;

    #[ORM\Column(name: 'receipt_token_hash', length: 64)]
    public string $receiptTokenHash;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    public \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'paid_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    public ?\DateTimeImmutable $paidAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }
}
