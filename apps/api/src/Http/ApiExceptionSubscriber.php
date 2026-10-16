<?php

declare(strict_types=1);

namespace App\Http;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;

final class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::EXCEPTION => 'onException'];
    }

    public function onException(ExceptionEvent $event): void
    {
        if (!str_starts_with($event->getRequest()->getPathInfo(), '/api/v1/')) {
            return;
        }

        $exception = $event->getThrowable();
        if ($exception instanceof ApiProblem) {
            $event->setResponse(new JsonResponse([
                'error' => [
                    'code' => $exception->errorCode,
                    'message' => $exception->getMessage(),
                    'fields' => $exception->fields === [] ? new \stdClass() : $exception->fields,
                ],
            ], $exception->status, ['Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store']));

            return;
        }
        $status = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;
        $code = match ($status) {
            404 => 'NOT_FOUND',
            405 => 'METHOD_NOT_ALLOWED',
            default => 'INTERNAL_ERROR',
        };
        $message = match ($status) {
            404 => 'Resource not found.',
            405 => 'Method not allowed.',
            default => 'An unexpected error occurred.',
        };

        $event->setResponse(new JsonResponse([
            'error' => ['code' => $code, 'message' => $message, 'fields' => new \stdClass()],
        ], $status, ['Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store']));
    }
}
