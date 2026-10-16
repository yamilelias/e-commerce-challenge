<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'products')]
#[ORM\UniqueConstraint(name: 'UNIQ_PRODUCTS_SKU', columns: ['sku'])]
#[ORM\Index(name: 'IDX_PRODUCTS_ACTIVE_CATEGORY_ID', columns: ['is_active', 'category_id', 'id'])]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', nullable: false)]
    public Category $category;

    #[ORM\Column(length: 200)]
    public string $name;

    #[ORM\Column(length: 100)]
    public string $sku;

    #[ORM\Column(type: Types::TEXT, options: ['default' => ''])]
    public string $description = '';

    #[ORM\Column(name: 'price_cents', type: 'integer')]
    public int $priceCents;

    #[ORM\Column(type: 'integer')]
    public int $stock;

    #[ORM\Column(name: 'weight_kg', type: Types::DECIMAL, precision: 10, scale: 3)]
    public string $weightKg;

    #[ORM\Column(name: 'image_url', type: Types::TEXT, nullable: true)]
    public ?string $imageUrl = null;

    #[ORM\Column(name: 'image_source_url', type: Types::TEXT, nullable: true)]
    public ?string $imageSourceUrl = null;

    #[ORM\Column(name: 'image_attribution', type: Types::TEXT, nullable: true)]
    public ?string $imageAttribution = null;

    #[ORM\Column(name: 'image_license', type: Types::TEXT, nullable: true)]
    public ?string $imageLicense = null;

    #[ORM\Column(name: 'image_license_url', type: Types::TEXT, nullable: true)]
    public ?string $imageLicenseUrl = null;

    #[ORM\Column(name: 'is_active', type: 'boolean', options: ['default' => true])]
    public bool $isActive = true;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    public \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE)]
    public \DateTimeImmutable $updatedAt;

    public function getId(): ?int
    {
        return $this->id;
    }
}
