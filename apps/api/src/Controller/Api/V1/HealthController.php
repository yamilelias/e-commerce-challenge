<?php

declare(strict_types=1);

namespace App\Controller\Api\V1;

use Doctrine\DBAL\Connection;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class HealthController
{
    #[Route('/api/v1/health', name: 'api_v1_health', methods: ['GET'])]
    public function __invoke(Connection $connection): JsonResponse
    {
        try {
            $connection->executeQuery('SELECT 1')->fetchOne();
        } catch (\Throwable) {
            return new JsonResponse([
                'error' => [
                    'code' => 'SERVICE_UNAVAILABLE',
                    'message' => 'Database is unavailable.',
                    'fields' => new \stdClass(),
                ],
            ], JsonResponse::HTTP_SERVICE_UNAVAILABLE, ['Content-Type' => 'application/json; charset=utf-8']);
        }

        return new JsonResponse(['data' => ['status' => 'ok', 'database' => 'ok']], 200, ['Content-Type' => 'application/json; charset=utf-8']);
    }
}
