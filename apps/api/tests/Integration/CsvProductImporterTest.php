<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Database\SqliteConnection;
use App\Http\ApiProblem;
use App\Service\CsvProductImporter;
use App\Service\ProductInput;
use App\Service\ProductService;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;

final class CsvProductImporterTest extends TestCase
{
    public function testMixedRowsLogicalNumbersAndIdempotentReplay(): void
    {
        [$importer, $db] = $this->setupImporter();
        $file = $this->csv("name,sku,description,category,price,stock,weight_kg\n\"Quoted\nName\",ab-1,,Kitchen,\$2.50,3,0.2\nRepeat,AB-1,,Kitchen,3.00,4,0.1\nBad,bad-1,,Other,free,2,0.1\n\n");
        try {
            $first = $importer->importFile($file);
            self::assertSame([4, 1, 2, 1], [$first['total_rows'], $first['inserted'], $first['skipped'], $first['rejected']]);
            self::assertSame([3, 4, 5], array_column($first['issues'], 'row'));
            self::assertSame(['DUPLICATE_IN_FILE', 'INVALID_PRICE', 'EMPTY_ROW'], array_column($first['issues'], 'code'));
            self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM products'));
            self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM categories'));

            $second = $importer->importFile($file);
            self::assertSame([4, 0, 3, 1], [$second['total_rows'], $second['inserted'], $second['skipped'], $second['rejected']]);
            self::assertSame('SKU_EXISTS', $second['issues'][0]['code']);
            self::assertSame(250, (int) $db->fetchOne("SELECT price_cents FROM products WHERE sku = 'AB-1'"));
        } finally {
            unlink($file);
        }
    }

    public function testInvalidHeaderRejectsWholeFileWithoutWrites(): void
    {
        [$importer, $db] = $this->setupImporter();
        $file = $this->csv("name,sku,price\nBottle,B-1,2.00\n");
        try {
            $this->expectException(ApiProblem::class);
            try {
                $importer->importFile($file);
            } finally {
                self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM products'));
            }
        } finally {
            unlink($file);
        }
    }

    public function testInvalidFirstOccurrenceDoesNotReserveSku(): void
    {
        [$importer, $db] = $this->setupImporter();
        $file = $this->csv("name,sku,description,category,price,stock,weight_kg\nBad,repeat-1,,Kitchen,free,1,0\nGood,repeat-1,,Kitchen,2.00,1,0\nAgain,REPEAT-1,,Kitchen,2.00,1,0\n");
        try {
            $result = $importer->importFile($file);
            self::assertSame([3, 1, 1, 1], [$result['total_rows'], $result['inserted'], $result['skipped'], $result['rejected']]);
            self::assertSame('Good', $db->fetchOne("SELECT name FROM products WHERE sku = 'REPEAT-1'"));
            self::assertSame('DUPLICATE_IN_FILE', $result['issues'][1]['code']);
        } finally {
            unlink($file);
        }
    }

    /** @return array{CsvProductImporter, Connection} */
    private function setupImporter(): array
    {
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true, 'wrapperClass' => SqliteConnection::class]);
        $db->executeStatement('CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(100) NOT NULL, slug VARCHAR(120) NOT NULL UNIQUE)');
        $db->executeStatement("CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, name VARCHAR(200) NOT NULL, sku VARCHAR(100) NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', price_cents INTEGER NOT NULL, stock INTEGER NOT NULL, weight_kg NUMERIC(10,3) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT 1, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY (category_id) REFERENCES categories(id))");
        $input = new ProductInput();
        $products = new ProductService($db, $input);

        return [new CsvProductImporter($input, $products), $db];
    }

    private function csv(string $content): string
    {
        $path = tempnam(sys_get_temp_dir(), 'csv-import-');
        file_put_contents($path, $content);

        return $path;
    }
}
