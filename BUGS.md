# Bugs, failures, and verification gaps

Status as documented on 2026-10-17. This is a short index; the linked QA records contain reproduction steps, commands, and observed results. A failed check caused by an unavailable runtime is listed as a verification gap, not an application defect.

## Open product limitation

| ID | Severity | Finding | Evidence and status |
| --- | --- | --- | --- |
| QA-004 | P1 | SQLite's built-in `LOWER()` does not case-fold some accented uppercase letters. Searching for `élan` can miss a product named `Élan`. | [Defect record](docs/qa/defects.md#qa-004--sqlite-search-unicode-casefold-limitation). Deferred for this MVP; ASCII case-insensitive search was verified. |

## Current redesign verification gaps

These checks need to run against the final products redesign and live API before their behavior can be claimed as verified:

- **Backend and migration:** The final PHP test suite, Doctrine migration on a populated database, and live product image DTO check were blocked because PHP and the Docker daemon were unavailable on 2026-10-17. Earlier backend tests passed before the last image-host change. See [products redesign verification](docs/qa/products-redesign.md).
- **Remote images:** The checked-in catalog has 85 primary images and 170 alternates. A bulk request confirmed 168 of 255 URLs; 87 returned HTTP 429 rate limits, so direct loading of every image remains unverified. See [products redesign verification](docs/qa/products-redesign.md).
- **Browser behavior:** Product-card alternate-image failure, reduced-motion behavior, a full keyboard/focus audit, disabled-JavaScript behavior, and complete asset/performance checks have not all been exercised. The products pages were browser-tested with a disposable API mock, not the final live API. See [products redesign verification](docs/qa/products-redesign.md) and [homepage redesign verification](docs/qa/home-redesign.md).

## Dependency follow-up

The last recorded full npm audit found five high advisories in the development-only ESLint dependency chain. The production-only audit found zero vulnerabilities. These advisories have not been recorded as an application defect. See [QA execution evidence](docs/qa/verification.md#qa-03-fresh-clone-delivery-check-2026-10-16).

## Resolved historical defects

| ID | Former failure | Resolution |
| --- | --- | --- |
| QA-001 | API Docker build referenced a missing Composer lockfile. | Lockfile committed; API image build passed. |
| QA-002 | API startup called an absent product seed command. | Command added; isolated Compose boot and repeat seed passed. |
| QA-003 | Web API proxy dropped the product-creation `Location` header. | Proxy fixed; authenticated HTTP smoke confirmed the header. |

The reproduction and retest evidence for these three issues is in the [defect log](docs/qa/defects.md). The earlier commerce release gates passed as recorded in [QA execution evidence](docs/qa/verification.md); the later redesign checks above have separate status.
