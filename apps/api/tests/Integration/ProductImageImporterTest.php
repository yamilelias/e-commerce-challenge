<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Database\SqliteConnection;
use App\Service\ProductImageImporter;
use App\Service\ProductInput;
use App\Service\ProductService;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;

final class ProductImageImporterTest extends TestCase
{
    public function testEnrichmentIsAtomicAndIdempotentAndExposedInDto(): void
    {
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true, 'wrapperClass' => SqliteConnection::class]);
        $db->executeStatement('CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE)');
        $db->executeStatement("CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, name TEXT NOT NULL, sku TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', price_cents INTEGER NOT NULL, stock INTEGER NOT NULL, weight_kg NUMERIC(10,3) NOT NULL, image_url TEXT DEFAULT NULL, image_source_url TEXT DEFAULT NULL, image_attribution TEXT DEFAULT NULL, image_license TEXT DEFAULT NULL, image_license_url TEXT DEFAULT NULL, is_active BOOLEAN NOT NULL DEFAULT 1, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)");
        $products = new ProductService($db, new ProductInput());
        $one = $products->create(['name' => 'One', 'sku' => 'one-1', 'category' => 'Test', 'price' => '1.00', 'stock' => 1, 'weight_kg' => '0']);
        $two = $products->create(['name' => 'Two', 'sku' => 'two-1', 'category' => 'Test', 'price' => '1.00', 'stock' => 1, 'weight_kg' => '0']);
        $row = [
            'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/640px-Photo.jpg',
            'image_source_url' => 'https://commons.wikimedia.org/wiki/File:Photo.jpg',
            'image_attribution' => 'Photographer',
            'image_license' => 'CC BY 4.0',
            'image_license_url' => 'https://creativecommons.org/licenses/by/4.0/',
        ];
        $file = tempnam(sys_get_temp_dir(), 'images-');
        self::assertIsString($file);
        try {
            file_put_contents($file, json_encode(['ONE-1' => $row, 'TWO-1' => [...$row, 'image_url' => 'http://invalid.example/image.jpg']], JSON_THROW_ON_ERROR));
            $importer = new ProductImageImporter($db);
            try {
                $importer->importFile($file);
                self::fail('Invalid second entry must reject entire file.');
            } catch (\InvalidArgumentException) {
                self::assertNull($products->detail($one['id'])['image_url']);
            }

            file_put_contents($file, json_encode(['ONE-1' => $row, 'MISSING-1' => $row], JSON_THROW_ON_ERROR));
            self::assertSame(['total' => 2, 'updated' => 1, 'skipped' => 0, 'missing' => 1], $importer->importFile($file));
            file_put_contents($file, json_encode(['ONE-1' => [...$row, 'image_attribution' => 'Different credit'], 'MISSING-1' => $row], JSON_THROW_ON_ERROR));
            self::assertSame(['total' => 2, 'updated' => 0, 'skipped' => 1, 'missing' => 1], $importer->importFile($file));
            foreach ($row as $field => $value) {
                self::assertSame($value, $products->detail($one['id'])[$field]);
                self::assertNull($products->detail($two['id'])[$field]);
            }
        } finally {
            unlink($file);
        }
    }
}
