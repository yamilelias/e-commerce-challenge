<?php

declare(strict_types=1);

namespace App\Command;

use App\Http\ApiProblem;
use App\Service\CsvProductImporter;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:products:seed', description: 'Create products from a CSV without changing existing SKUs.')]
final class SeedProductsCommand extends Command
{
    public function __construct(private readonly CsvProductImporter $importer)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('file', null, InputOption::VALUE_REQUIRED, 'Path to the CSV seed file.');
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
        } catch (ApiProblem $problem) {
            $output->writeln(json_encode(['error' => ['code' => $problem->errorCode, 'message' => $problem->getMessage(), 'fields' => $problem->fields]], JSON_THROW_ON_ERROR));

            return Command::FAILURE;
        }
        $output->writeln(json_encode(['data' => $result], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));

        return Command::SUCCESS;
    }
}
