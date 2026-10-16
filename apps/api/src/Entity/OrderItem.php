<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'order_items')]
#[ORM\Index(name: 'IDX_ORDER_ITEMS_ORDER', columns: ['order_id'])]
#[ORM\Index(name: 'IDX_ORDER_ITEMS_PRODUCT', columns: ['product_id'])]
class OrderItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Order::class)]
    #[ORM\JoinColumn(name: 'order_id', nullable: false, onDelete: 'CASCADE')]
    public Order $order;

    #[ORM\ManyToOne(targetEntity: Product::class)]
    #[ORM\JoinColumn(name: 'product_id', nullable: true, onDelete: 'SET NULL')]
    public ?Product $product = null;

    #[ORM\Column(name: 'sku_snapshot', length: 100)]
    public string $skuSnapshot;

    #[ORM\Column(name: 'name_snapshot', length: 200)]
    public string $nameSnapshot;

    #[ORM\Column(type: 'integer')]
    public int $quantity;

    #[ORM\Column(name: 'unit_price_cents', type: 'integer')]
    public int $unitPriceCents;

    #[ORM\Column(name: 'line_total_cents', type: 'integer')]
    public int $lineTotalCents;

    public function getId(): ?int
    {
        return $this->id;
    }
}
