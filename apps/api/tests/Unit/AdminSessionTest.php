<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Http\ApiProblem;
use App\Security\AdminSession;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpFoundation\Session\Storage\MockArraySessionStorage;

final class AdminSessionTest extends TestCase
{
    public function testAnonymousBootstrapLoginAndTokenRotation(): void
    {
        $admin = new AdminSession('admin', password_hash('correct', PASSWORD_DEFAULT), 'http://localhost:3000');
        $session = new Session(new MockArraySessionStorage());
        $request = Request::create('/api/v1/admin/session');
        $request->setSession($session);
        $before = $admin->state($request);

        self::assertFalse($before['authenticated']);
        self::assertNull($before['username']);
        self::assertNotEmpty($before['csrf_token']);

        $request->headers->set('X-CSRF-Token', $before['csrf_token']);
        $request->headers->set('Origin', 'http://localhost:3000');
        $after = $admin->login($request, 'admin', 'correct');
        self::assertTrue($after['authenticated']);
        self::assertSame('admin', $after['username']);
        self::assertNotSame($before['csrf_token'], $after['csrf_token']);
    }

    public function testMissingCsrfIsRejected(): void
    {
        $admin = new AdminSession('admin', password_hash('correct', PASSWORD_DEFAULT), 'http://localhost:3000');
        $request = Request::create('/api/v1/admin/login');
        $request->setSession(new Session(new MockArraySessionStorage()));
        $admin->state($request);

        try {
            $admin->login($request, 'admin', 'correct');
            self::fail('Login should reject a missing CSRF token.');
        } catch (ApiProblem $problem) {
            self::assertSame(403, $problem->status);
            self::assertSame('CSRF_INVALID', $problem->errorCode);
        }
    }
}
