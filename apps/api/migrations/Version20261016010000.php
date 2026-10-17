<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261016010000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add ordered alternate product images';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf($this->connection->getDatabasePlatform()->getName() !== 'sqlite', 'This migration requires SQLite.');
        $this->addSql('CREATE TABLE product_images (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, product_id INTEGER NOT NULL, position INTEGER NOT NULL, image_url CLOB NOT NULL, image_source_url CLOB NOT NULL, image_attribution CLOB NOT NULL, image_license CLOB NOT NULL, image_license_url CLOB NOT NULL, CONSTRAINT FK_PRODUCT_IMAGES_PRODUCT FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE, CONSTRAINT product_image_position CHECK (position IN (1, 2)))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PRODUCT_IMAGES_PRODUCT_POSITION ON product_images (product_id, position)');
    }

    public function down(Schema $schema): void
    {
        $this->abortIf($this->connection->getDatabasePlatform()->getName() !== 'sqlite', 'This migration requires SQLite.');
        $this->addSql('DROP TABLE product_images');
    }
}
