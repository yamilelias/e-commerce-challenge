<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Controller\Api\V1\HealthController;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;

final class HealthControllerTest extends TestCase
{
    public function testHealthyDatabase(): void
    {
        $connection = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true]);
        $response = (new HealthController())($connection);

        self::assertSame(200, $response->getStatusCode());
        self::assertSame(['data' => ['status' => 'ok', 'database' => 'ok']], json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR));
    }

    public function testUnavailableDatabase(): void
    {
        $connection = DriverManager::getConnection([
            'driver' => 'pdo_sqlite',
            'path' => sys_get_temp_dir().'/missing-api-db-dir-'.bin2hex(random_bytes(8)).'/db.sqlite',
        ]);
        $response = (new HealthController())($connection);
        $body = json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame(503, $response->getStatusCode());
        self::assertSame('SERVICE_UNAVAILABLE', $body['error']['code']);
        self::assertSame([], $body['error']['fields']);
        self::assertArrayNotHasKey('path', $body['error']);
    }
}
