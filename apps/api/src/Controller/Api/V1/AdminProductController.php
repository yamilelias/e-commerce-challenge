<?php

declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Http\JsonInput;
use App\Security\AdminSession;
use App\Service\ProductService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class AdminProductController
{
    public function __construct(private readonly AdminSession $admin, private readonly ProductService $products, private readonly JsonInput $json)
    {
    }

    #[Route('/api/v1/admin/products', name: 'api_v1_admin_products_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $this->admin->requireAdmin($request);

        return new JsonResponse($this->products->list($request->query->all(), true), 200, [
            'Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store',
        ]);
    }

    #[Route('/api/v1/admin/products/{id}', name: 'api_v1_admin_products_detail', methods: ['GET'], requirements: ['id' => '[^/]+'])]
    public function detail(Request $request, string $id): JsonResponse
    {
        $this->admin->requireAdmin($request);

        return new JsonResponse(['data' => $this->products->detail($this->products->parseId($id), true)], 200, [
            'Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store',
        ]);
    }

    #[Route('/api/v1/products', name: 'api_v1_products_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $this->admin->requireAdmin($request, true);
        $product = $this->products->create($this->json->read($request));

        return new JsonResponse(['data' => $product], 201, [
            'Content-Type' => 'application/json; charset=utf-8',
            'Cache-Control' => 'no-store',
            'Location' => '/api/v1/products/'.$product['id'],
        ]);
    }

    #[Route('/api/v1/products/{id}', name: 'api_v1_products_update', methods: ['PATCH'], requirements: ['id' => '[^/]+'])]
    public function update(Request $request, string $id): JsonResponse
    {
        $this->admin->requireAdmin($request, true);
        $product = $this->products->update($this->products->parseId($id), $this->json->read($request));

        return new JsonResponse(['data' => $product], 200, [
            'Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store',
        ]);
    }

    #[Route('/api/v1/products/{id}', name: 'api_v1_products_delete', methods: ['DELETE'], requirements: ['id' => '[^/]+'])]
    public function delete(Request $request, string $id): Response
    {
        $this->admin->requireAdmin($request, true);
        $this->products->delete($this->products->parseId($id));

        return new Response('', 204, ['Cache-Control' => 'no-store']);
    }
}
