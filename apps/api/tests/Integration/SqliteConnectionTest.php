<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Database\SqliteConnection;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;

final class SqliteConnectionTest extends TestCase
{
    public function testForeignKeysAndBusyTimeoutAreEnabledOnEveryConnection(): void
    {
        $connection = DriverManager::getConnection([
            'driver' => 'pdo_sqlite',
            'memory' => true,
            'wrapperClass' => SqliteConnection::class,
        ]);

        self::assertSame(1, (int) $connection->fetchOne('PRAGMA foreign_keys'));
        self::assertSame(5000, (int) $connection->fetchOne('PRAGMA busy_timeout'));

        $connection->close();
        self::assertSame(1, (int) $connection->fetchOne('PRAGMA foreign_keys'));
    }
}
