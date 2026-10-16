<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261016000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add optional remote image attribution to products';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf($this->connection->getDatabasePlatform()->getName() !== 'sqlite', 'This migration requires SQLite.');
        $this->addSql('ALTER TABLE products ADD COLUMN image_url CLOB DEFAULT NULL');
        $this->addSql('ALTER TABLE products ADD COLUMN image_source_url CLOB DEFAULT NULL');
        $this->addSql('ALTER TABLE products ADD COLUMN image_attribution CLOB DEFAULT NULL');
        $this->addSql('ALTER TABLE products ADD COLUMN image_license CLOB DEFAULT NULL');
        $this->addSql('ALTER TABLE products ADD COLUMN image_license_url CLOB DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->abortIf($this->connection->getDatabasePlatform()->getName() !== 'sqlite', 'This migration requires SQLite.');
        $this->addSql('ALTER TABLE products DROP COLUMN image_url');
        $this->addSql('ALTER TABLE products DROP COLUMN image_source_url');
        $this->addSql('ALTER TABLE products DROP COLUMN image_attribution');
        $this->addSql('ALTER TABLE products DROP COLUMN image_license');
        $this->addSql('ALTER TABLE products DROP COLUMN image_license_url');
    }
}
