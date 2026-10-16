<?php

declare(strict_types=1);

namespace App\Security;

use App\Http\ApiProblem;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;

final class AdminSession
{
    public function __construct(
        #[Autowire('%env(ADMIN_USERNAME)%')] private readonly string $username,
        #[Autowire('%env(ADMIN_PASSWORD_HASH)%')] private readonly string $passwordHash,
        #[Autowire('%env(PUBLIC_ORIGIN)%')] private readonly string $publicOrigin,
    ) {
    }

    public function state(Request $request): array
    {
        $session = $request->getSession();
        if (!$session->has('csrf_token')) {
            $session->set('csrf_token', bin2hex(random_bytes(32)));
        }

        $name = $session->get('admin_username');

        return ['authenticated' => is_string($name), 'username' => is_string($name) ? $name : null, 'csrf_token' => $session->get('csrf_token')];
    }

    public function login(Request $request, string $username, string $password): array
    {
        $this->checkCsrfAndOrigin($request);
        if (!hash_equals($this->username, $username) || !password_verify($password, $this->passwordHash)) {
            throw new ApiProblem(401, 'INVALID_CREDENTIALS', 'Invalid administrator credentials.');
        }

        $session = $request->getSession();
        $session->migrate(true);
        $session->set('admin_username', $this->username);
        $session->set('csrf_token', bin2hex(random_bytes(32)));

        return $this->state($request);
    }

    public function requireAdmin(Request $request, bool $write = false): void
    {
        if (!$request->hasPreviousSession() || !is_string($request->getSession()->get('admin_username'))) {
            throw new ApiProblem(401, 'UNAUTHENTICATED', 'Administrator login required.');
        }
        if ($write) {
            $this->checkCsrfAndOrigin($request);
        }
    }

    public function logout(Request $request): void
    {
        $this->requireAdmin($request, true);
        $request->getSession()->invalidate();
    }

    private function checkCsrfAndOrigin(Request $request): void
    {
        $session = $request->getSession();
        $expected = $session->get('csrf_token');
        $provided = $request->headers->get('X-CSRF-Token');
        if (!is_string($expected) || !is_string($provided) || !hash_equals($expected, $provided)) {
            throw new ApiProblem(403, 'CSRF_INVALID', 'Session validation failed. Refresh and retry.');
        }

        $origin = $request->headers->get('Origin');
        if ($origin !== null && !hash_equals(rtrim($this->publicOrigin, '/'), $origin)) {
            throw new ApiProblem(403, 'FORBIDDEN', 'Origin is not allowed.');
        }
    }
}
