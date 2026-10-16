<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Http\ApiProblem;
use App\Service\ProductInput;
use PHPUnit\Framework\TestCase;

final class ProductInputTest extends TestCase
{
    public function testNormalizesMoneySkuCategoryAndWeight(): void
    {
        $actual = (new ProductInput())->normalize([
            'name' => ' Bottle ', 'sku' => ' bs-001 ', 'category' => 'Food  &  Beverage',
            'price' => '29.99', 'stock' => 3, 'weight_kg' => '0.35',
        ]);

        self::assertSame('BS-001', $actual['sku']);
        self::assertSame('Food & Beverage', $actual['category']);
        self::assertSame(2999, $actual['price_cents']);
        self::assertSame('0.350', $actual['weight_kg']);
        self::assertSame('', $actual['description']);
    }

    public function testRejectsNumericDecimalInput(): void
    {
        $this->expectException(ApiProblem::class);
        (new ProductInput())->normalize(['price' => 29.99], partial: true);
    }

    public function testCsvCanParseDollarPriceAndTextStock(): void
    {
        $actual = (new ProductInput())->normalize([
            'name' => 'Bottle', 'sku' => 'B-1', 'category' => 'Home',
            'price' => '$2.50', 'stock' => '12', 'weight_kg' => '0',
        ], csv: true);

        self::assertSame(250, $actual['price_cents']);
        self::assertSame(12, $actual['stock']);
    }
}
