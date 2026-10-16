<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Database\SqliteConnection;
use App\Http\ApiProblem;
use App\Service\ProductInput;
use App\Service\ProductService;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;

final class ProductServiceTest extends TestCase
{
    public function testLiteralSearchPaginationAndSoftDelete(): void
    {
        $service = $this->service();
        $cotton = $service->create(['name' => '50% Cotton', 'sku' => 'cotton-1', 'category' => 'Clothing', 'price' => '12.50', 'stock' => 3, 'weight_kg' => '0.25']);
        $service->create(['name' => 'Steel Bottle', 'sku' => 'bottle-1', 'category' => 'Kitchen', 'price' => '29.99', 'stock' => 4, 'weight_kg' => '0.35']);

        self::assertSame('COTTON-1', $cotton['sku']);
        self::assertSame(1250, $cotton['price_cents']);
        self::assertSame('0.250', $cotton['weight_kg']);
        foreach (['image_url', 'image_source_url', 'image_attribution', 'image_license', 'image_license_url'] as $field) {
            self::assertNull($cotton[$field]);
        }
        $found = $service->list(['q' => '%', 'page' => '1', 'per_page' => '1']);
        self::assertSame(1, $found['pagination']['total']);
        self::assertSame($cotton['id'], $found['data'][0]['id']);

        $service->delete($cotton['id']);
        self::assertSame(0, $service->list(['q' => '%'])['pagination']['total']);
        self::assertFalse($service->detail($cotton['id'], true)['is_active']);
        try {
            $service->detail($cotton['id']);
            self::fail('Inactive product should not be public.');
        } catch (ApiProblem $problem) {
            self::assertSame(404, $problem->status);
        }
    }

    private function service(): ProductService
    {
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true, 'wrapperClass' => SqliteConnection::class]);
        $db->executeStatement('CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(100) NOT NULL, slug VARCHAR(120) NOT NULL UNIQUE)');
        $db->executeStatement("CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, name VARCHAR(200) NOT NULL, sku VARCHAR(100) NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', price_cents INTEGER NOT NULL, stock INTEGER NOT NULL, weight_kg NUMERIC(10,3) NOT NULL, image_url TEXT DEFAULT NULL, image_source_url TEXT DEFAULT NULL, image_attribution TEXT DEFAULT NULL, image_license TEXT DEFAULT NULL, image_license_url TEXT DEFAULT NULL, is_active BOOLEAN NOT NULL DEFAULT 1, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY (category_id) REFERENCES categories(id))");

        return new ProductService($db, new ProductInput());
    }
}
