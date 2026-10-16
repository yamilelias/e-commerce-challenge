<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'categories')]
#[ORM\UniqueConstraint(name: 'UNIQ_CATEGORIES_SLUG', columns: ['slug'])]
class Category
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    public string $name;

    #[ORM\Column(length: 120)]
    public string $slug;

    public function getId(): ?int
    {
        return $this->id;
    }
}
