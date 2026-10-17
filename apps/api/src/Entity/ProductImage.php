<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'product_images')]
#[ORM\UniqueConstraint(name: 'UNIQ_PRODUCT_IMAGES_PRODUCT_POSITION', columns: ['product_id', 'position'])]
class ProductImage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Product::class)]
    #[ORM\JoinColumn(name: 'product_id', nullable: false, onDelete: 'CASCADE')]
    public Product $product;

    #[ORM\Column(type: 'integer')]
    public int $position;

    #[ORM\Column(name: 'image_url', type: Types::TEXT)]
    public string $imageUrl;

    #[ORM\Column(name: 'image_source_url', type: Types::TEXT)]
    public string $imageSourceUrl;

    #[ORM\Column(name: 'image_attribution', type: Types::TEXT)]
    public string $imageAttribution;

    #[ORM\Column(name: 'image_license', type: Types::TEXT)]
    public string $imageLicense;

    #[ORM\Column(name: 'image_license_url', type: Types::TEXT)]
    public string $imageLicenseUrl;
}
