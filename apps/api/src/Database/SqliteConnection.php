<?php

declare(strict_types=1);

namespace App\Database;

use Doctrine\DBAL\Connection;

/** Sets SQLite connection-local safety options for HTTP, CLI, and migrations. */
final class SqliteConnection extends Connection
{
    public function connect(): bool
    {
        $connected = parent::connect();
        if ($connected) {
            $this->executeStatement('PRAGMA foreign_keys = ON');
            $this->executeStatement('PRAGMA busy_timeout = 5000');
        }

        return $connected;
    }
}
