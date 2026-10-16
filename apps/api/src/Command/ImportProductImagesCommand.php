<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\ProductImageImporter;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:products:images', description: 'Add curated image metadata to products without replacing existing images.')]
final class ImportProductImagesCommand extends Command
{
    public function __construct(private readonly ProductImageImporter $importer)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('file', null, InputOption::VALUE_REQUIRED, 'Path to the JSON image catalog.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $file = $input->getOption('file');
        if (!is_string($file) || $file === '') {
            $output->writeln('<error>--file is required.</error>');
            return Command::FAILURE;
        }
        try {
            $result = $this->importer->importFile($file);
        } catch (\InvalidArgumentException $error) {
            $output->writeln(json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR));
            return Command::FAILURE;
        }
        $output->writeln(json_encode(['data' => $result], JSON_THROW_ON_ERROR));
        return Command::SUCCESS;
    }
}
