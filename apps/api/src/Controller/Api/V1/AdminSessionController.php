<?php

declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Http\ApiProblem;
use App\Http\JsonInput;
use App\Security\AdminSession;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class AdminSessionController
{
    public function __construct(private readonly AdminSession $admin, private readonly JsonInput $json)
    {
    }

    #[Route('/api/v1/admin/session', name: 'api_v1_admin_session', methods: ['GET'])]
    public function session(Request $request): JsonResponse
    {
        return new JsonResponse(['data' => $this->admin->state($request)], 200, [
            'Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store',
        ]);
    }

    #[Route('/api/v1/admin/login', name: 'api_v1_admin_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = $this->json->read($request);
        $unknown = array_diff(array_keys($data), ['username', 'password']);
        if ($unknown !== []) {
            throw new ApiProblem(422, 'INVALID_FIELD', 'Unexpected request field.', [reset($unknown) => ['This field is not allowed.']]);
        }
        if (!isset($data['username'], $data['password']) || !is_string($data['username']) || !is_string($data['password']) || $data['username'] === '' || $data['password'] === '') {
            throw new ApiProblem(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', ['username' => ['Username and password are required.']]);
        }

        return new JsonResponse(['data' => $this->admin->login($request, $data['username'], $data['password'])], 200, [
            'Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store',
        ]);
    }

    #[Route('/api/v1/admin/logout', name: 'api_v1_admin_logout', methods: ['POST'])]
    public function logout(Request $request): Response
    {
        $cookieName = $request->getSession()->getName();
        $this->admin->logout($request);
        $response = new Response('', 204, ['Cache-Control' => 'no-store']);
        $response->headers->setCookie(Cookie::create($cookieName)->withValue('')->withExpires(new \DateTimeImmutable('@1'))->withPath('/')->withHttpOnly(true)->withSameSite('lax'));

        return $response;
    }
}
