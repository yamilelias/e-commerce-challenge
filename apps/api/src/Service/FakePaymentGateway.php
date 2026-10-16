<?php

declare(strict_types=1);

namespace App\Service;

class FakePaymentGateway
{
    public function pay(int $totalCents): bool
    {
        return $totalCents > 0;
    }
}
