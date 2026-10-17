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
        $db->executeStatement('CREATE TABLE product_images (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, position INTEGER NOT NULL, image_url TEXT NOT NULL, image_source_url TEXT NOT NULL, image_attribution TEXT NOT NULL, image_license TEXT NOT NULL, image_license_url TEXT NOT NULL, UNIQUE(product_id, position))');
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
        $alternateOne = [...$row, 'image_url' => 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Alternate1.jpg/640px-Alternate1.jpg'];
        $alternateTwo = [...$row, 'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Alternate2.jpg'];
        $gallery = [...$row, 'alternate_images' => [$alternateOne, $alternateTwo]];
        $file = tempnam(sys_get_temp_dir(), 'images-');
        self::assertIsString($file);
        try {
            file_put_contents($file, json_encode(['ONE-1' => $gallery, 'TWO-1' => [...$gallery, 'alternate_images' => [$alternateOne, [...$alternateTwo, 'image_url' => 'http://invalid.example/image.jpg']]]], JSON_THROW_ON_ERROR));
            $importer = new ProductImageImporter($db);
            try {
                $importer->importFile($file);
                self::fail('Invalid second entry must reject entire file.');
            } catch (\InvalidArgumentException) {
                self::assertNull($products->detail($one['id'])['image_url']);
                self::assertSame([], $products->detail($one['id'])['images']);
            }

            file_put_contents($file, json_encode(['ONE-1' => $gallery, 'MISSING-1' => $gallery], JSON_THROW_ON_ERROR));
            self::assertSame(['total' => 2, 'updated' => 1, 'skipped' => 0, 'missing' => 1], $importer->importFile($file));
            self::assertSame([$row['image_url'], $alternateOne['image_url'], $alternateTwo['image_url']], array_column($products->detail($one['id'])['images'], 'url'));
            file_put_contents($file, json_encode(['ONE-1' => [...$gallery, 'image_attribution' => 'Different credit'], 'MISSING-1' => $gallery], JSON_THROW_ON_ERROR));
            self::assertSame(['total' => 2, 'updated' => 0, 'skipped' => 1, 'missing' => 1], $importer->importFile($file));
            foreach ($row as $field => $value) {
                self::assertSame($value, $products->detail($one['id'])[$field]);
                self::assertNull($products->detail($two['id'])[$field]);
            }
            self::assertSame(3, count($products->list([])['data'][0]['images']));

            // A pre-existing primary and first alternate are preserved while slot two is filled.
            $db->update('products', $row, ['id' => $two['id']]);
            $db->insert('product_images', ['product_id' => $two['id'], 'position' => 1, ...$alternateOne]);
            file_put_contents($file, json_encode(['TWO-1' => [...$gallery, 'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Replacement.jpg']], JSON_THROW_ON_ERROR));
            self::assertSame(['total' => 1, 'updated' => 1, 'skipped' => 0, 'missing' => 0], $importer->importFile($file));
            self::assertSame([$row['image_url'], $alternateOne['image_url'], $alternateTwo['image_url']], array_column($products->detail($two['id'])['images'], 'url'));
            self::assertSame(['total' => 1, 'updated' => 0, 'skipped' => 1, 'missing' => 0], $importer->importFile($file));

            // Five-field catalogs from before the gallery amendment still import.
            file_put_contents($file, json_encode(['TWO-1' => $row], JSON_THROW_ON_ERROR));
            self::assertSame(['total' => 1, 'updated' => 0, 'skipped' => 1, 'missing' => 0], $importer->importFile($file));
        } finally {
            unlink($file);
        }
    }
}
