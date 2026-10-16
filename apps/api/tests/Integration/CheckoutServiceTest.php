<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Database\SqliteConnection;
use App\Http\ApiProblem;
use App\Service\CheckoutService;
use App\Service\FakePaymentGateway;
use App\Service\ReceiptTokenService;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;

final class CheckoutServiceTest extends TestCase
{
    private const KEY = '550e8400-e29b-41d4-a716-446655440000';

    public function testPaidOrderReplayConflictAndReceiptCapability(): void
    {
        [$checkout, $db] = $this->fixture(stock: 5);
        $body = $this->body([['product_id' => 1, 'quantity' => 1], ['product_id' => 1, 'quantity' => 2]]);
        $first = $checkout->checkout($body, self::KEY);

        self::assertSame(201, $first['status']);
        self::assertSame(8997, $first['data']['total_cents']);
        self::assertSame(3, $first['data']['items'][0]['quantity']);
        self::assertSame(hash_hmac('sha256', 'receipt:v1:'.self::KEY, str_repeat('s', 32)), $first['data']['receipt_token']);
        self::assertSame(2, (int) $db->fetchOne('SELECT stock FROM products WHERE id = 1'));
        self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM orders'));

        $replay = $checkout->checkout($this->body([['product_id' => 1, 'quantity' => 3]]), strtoupper(self::KEY));
        self::assertSame(200, $replay['status']);
        self::assertSame($first['data'], $replay['data']);
        self::assertSame(2, (int) $db->fetchOne('SELECT stock FROM products WHERE id = 1'));

        $this->assertProblem(409, 'IDEMPOTENCY_CONFLICT', fn () => $checkout->checkout($this->body([['product_id' => 1, 'quantity' => 2]]), self::KEY));
        self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM orders'));

        $reference = $first['data']['reference'];
        $token = $first['data']['receipt_token'];
        $receipt = $checkout->lookup($reference, $token);
        self::assertSame($reference, $receipt['reference']);
        self::assertArrayNotHasKey('receipt_token', $receipt);
        $this->assertProblem(400, 'BAD_QUERY', fn () => $checkout->lookup($reference, null));
        $this->assertProblem(404, 'NOT_FOUND', fn () => $checkout->lookup($reference, str_repeat('0', 64)));
        $this->assertProblem(404, 'NOT_FOUND', fn () => $checkout->lookup('ORD-UNKNOWN12345', $token));
    }

    public function testInsufficientStockAndUnavailableProductRollback(): void
    {
        [$checkout, $db] = $this->fixture(stock: 1);
        $this->assertProblem(409, 'INSUFFICIENT_STOCK', fn () => $checkout->checkout($this->body([['product_id' => 1, 'quantity' => 2]]), self::KEY));
        $this->assertProblem(409, 'PRODUCT_UNAVAILABLE', fn () => $checkout->checkout($this->body([['product_id' => 99, 'quantity' => 1]]), self::KEY));
        self::assertSame(1, (int) $db->fetchOne('SELECT stock FROM products WHERE id = 1'));
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM orders'));
    }

    public function testInvalidCheckoutPayloadsNeverWrite(): void
    {
        [$checkout, $db] = $this->fixture(stock: 3);
        $this->assertProblem(422, 'VALIDATION_ERROR', fn () => $checkout->checkout($this->body([['product_id' => 1, 'quantity' => 1]]), null));
        $this->assertProblem(422, 'INVALID_FIELD', fn () => $checkout->checkout($this->body([['product_id' => 1, 'quantity' => 1]]) + ['total_cents' => 1], self::KEY));
        $this->assertProblem(422, 'VALIDATION_ERROR', fn () => $checkout->checkout($this->body([['product_id' => 1, 'quantity' => 999], ['product_id' => 1, 'quantity' => 1]]), self::KEY));
        self::assertSame(3, (int) $db->fetchOne('SELECT stock FROM products WHERE id = 1'));
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM orders'));
    }

    public function testPaymentFailureRollsBackStockAndOrder(): void
    {
        $failure = new class extends FakePaymentGateway {
            public function pay(int $totalCents): bool
            {
                return false;
            }
        };
        [$checkout, $db] = $this->fixture(stock: 1, payment: $failure);
        try {
            $checkout->checkout($this->body([['product_id' => 1, 'quantity' => 1]]), self::KEY);
            self::fail('Fake payment failure should abort checkout.');
        } catch (\RuntimeException) {
            self::assertSame(1, (int) $db->fetchOne('SELECT stock FROM products WHERE id = 1'));
            self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM orders'));
        }
    }

    public function testTwoWritersCannotBuyTheSameFinalUnit(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'checkout-race-db-');
        $gate = tempnam(sys_get_temp_dir(), 'checkout-race-gate-');
        unlink($gate);
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'path' => $path, 'wrapperClass' => SqliteConnection::class]);
        self::schema($db);
        $db->insert('products', ['id' => 1, 'sku' => 'BS-021', 'name' => 'Steel Bottle', 'price_cents' => 2999, 'stock' => 1, 'is_active' => 1, 'updated_at' => '2026-10-16 00:00:00']);
        $db->close();
        $workers = [];
        try {
            foreach (['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'] as $key) {
                $process = proc_open([PHP_BINARY, dirname(__DIR__).'/Fixtures/CheckoutWorker.php', $path, $gate, $key], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
                self::assertIsResource($process);
                $workers[] = [$process, $pipes];
            }
            touch($gate);
            $statuses = [];
            foreach ($workers as [$process, $pipes]) {
                $stdout = stream_get_contents($pipes[1]);
                $stderr = stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                self::assertSame(0, proc_close($process), $stderr);
                $statuses[] = json_decode($stdout, true, 512, JSON_THROW_ON_ERROR);
            }
            $codes = array_column($statuses, 'status');
            sort($codes);
            self::assertSame([201, 409], $codes);
            self::assertSame(0, (int) $db->fetchOne('SELECT stock FROM products WHERE id = 1'));
            self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM orders'));
        } finally {
            unlink($path);
            @unlink($gate);
        }
    }

    /** @return array{CheckoutService, Connection} */
    private function fixture(int $stock, ?FakePaymentGateway $payment = null): array
    {
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true, 'wrapperClass' => SqliteConnection::class]);
        self::schema($db);
        $db->insert('products', ['id' => 1, 'sku' => 'BS-021', 'name' => 'Steel Bottle', 'price_cents' => 2999, 'stock' => $stock, 'is_active' => 1, 'updated_at' => '2026-10-16 00:00:00']);

        return [new CheckoutService($db, new ReceiptTokenService(str_repeat('s', 32)), $payment ?? new FakePaymentGateway()), $db];
    }

    public static function schema(Connection $db): void
    {
        $db->executeStatement('CREATE TABLE products (id INTEGER PRIMARY KEY, sku TEXT NOT NULL, name TEXT NOT NULL, price_cents INTEGER NOT NULL, stock INTEGER NOT NULL CHECK (stock >= 0), is_active BOOLEAN NOT NULL, updated_at TEXT NOT NULL)');
        $db->executeStatement('CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT UNIQUE NOT NULL, buyer_name TEXT NOT NULL, buyer_email TEXT NOT NULL, status TEXT NOT NULL, currency TEXT NOT NULL, total_cents INTEGER NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, request_fingerprint TEXT NOT NULL, receipt_token_hash TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, paid_at TEXT)');
        $db->executeStatement('CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER, sku_snapshot TEXT NOT NULL, name_snapshot TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL, line_total_cents INTEGER NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id))');
    }

    /** @param list<array{product_id:int,quantity:int}> $items */
    private function body(array $items): array
    {
        return ['buyer_name' => ' Alex Customer ', 'buyer_email' => 'ALEX@example.com', 'items' => $items];
    }

    private function assertProblem(int $status, string $code, callable $run): void
    {
        try {
            $run();
            self::fail('Expected API problem.');
        } catch (ApiProblem $problem) {
            self::assertSame($status, $problem->status);
            self::assertSame($code, $problem->errorCode);
        }
    }
}
