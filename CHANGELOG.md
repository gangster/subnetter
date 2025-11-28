# [2.1.0](https://github.com/gangster/subnetter/compare/v2.0.1...v2.1.0) (2025-11-28)


### Bug Fixes

* **docs:** correct subnet type ordering in all examples ([e9932a3](https://github.com/gangster/subnetter/commit/e9932a395834359cabca495a843a725fd6bba57b))
* **docs:** simplify CIDR primer quick reference to prevent layout overflow ([#7](https://github.com/gangster/subnetter/issues/7)) ([f551809](https://github.com/gangster/subnetter/commit/f5518096f5104af66806134a8e36b3e9f187a332))


### Features

* add NetBox integration design and development environment ([c4769f2](https://github.com/gangster/subnetter/commit/c4769f2658ab6e01049a7480fc2c914934b944f3))
* **netbox:** NetBox IPAM integration ([#10](https://github.com/gangster/subnetter/issues/10)) ([fe91a23](https://github.com/gangster/subnetter/commit/fe91a2302ec90d03592dddd7f26f5881692407bd))

## [2.0.1](https://github.com/gangster/subnetter/compare/v2.0.0...v2.0.1) (2025-11-27)


### Bug Fixes

* resolve linting errors in comprehensive validation tests ([ff8a5f3](https://github.com/gangster/subnetter/commit/ff8a5f32e7a4fe1ff257b0080369cefc502ad3b9))

# [2.0.0](https://github.com/gangster/subnetter/compare/v1.0.0...v2.0.0) (2025-11-27)


### Bug Fixes

* add cidr-utils module mapping to jest config ([bf202f4](https://github.com/gangster/subnetter/commit/bf202f466ef029d41194f9f260a149bd31f3c0e3))
* add dedicated tsconfig for tests to resolve module paths ([a33bd17](https://github.com/gangster/subnetter/commit/a33bd175db0da7c8e5846e9eeb8553030db5a9b8))
* **allocator:** implement non-overlapping subnet allocation ([4b140c3](https://github.com/gangster/subnetter/commit/4b140c3da8d34069c5f5925c2a978e10073cc65b))
* **ci:** ensure check-release job runs after test matrix completes ([490ec9d](https://github.com/gangster/subnetter/commit/490ec9d0ffbfbfb854ffca799e15188ae2872f9e))
* **ci:** ensure test job runs after build completes ([beca16a](https://github.com/gangster/subnetter/commit/beca16aacc39928f814c815ff5c468978b811750))
* **ci:** fix YAML syntax in workflow conditions ([15d594c](https://github.com/gangster/subnetter/commit/15d594c0b9c3190d7c7c8144dfcfe86ed99de97f))
* **cloud-providers:** correct availability zone naming patterns for all providers ([1e5b0f1](https://github.com/gangster/subnetter/commit/1e5b0f14ef6189476fa9e7bc998ae85e03a0368d))
* correct Azure AZ naming convention ([342d28a](https://github.com/gangster/subnetter/commit/342d28a40e7af0ddfd6fa8bbf0cd79cc3d2aca1c))
* **deps:** add resolution for hosted-git-info to fix yarn install ([1a9b7e1](https://github.com/gangster/subnetter/commit/1a9b7e15262aef351bf9868848092aef9a36a62a))
* **deps:** add resolution for normalize-package-data ([cbaf3f9](https://github.com/gangster/subnetter/commit/cbaf3f9bd2a6251730fd923c011b8984dc68102c))
* **e2e-tests:** update test fixtures to ensure correct region name formats ([15a4063](https://github.com/gangster/subnetter/commit/15a40638dfec34ba92d6157970daa2e70bf63c71))
* **e2e:** update test fixtures and configs to match current schema ([75a64dd](https://github.com/gangster/subnetter/commit/75a64dd8d704a65fe3d636051d3e5b7bbe25ef4c))
* fix linter issues and update e2e tests ([efa4bdf](https://github.com/gangster/subnetter/commit/efa4bdf99ed7f7fea1ea162420ade2e6eb823426))
* reorder subnet types to avoid CIDR overlaps ([22a67f8](https://github.com/gangster/subnetter/commit/22a67f8c5bb016136f3c25fdaa2be9ff071c74b8))
* **tests:** update production configuration tests to pass with current codebase format ([b3c29ea](https://github.com/gangster/subnetter/commit/b3c29ea2d65be29e74b88f2d864416c692302794))
* update provider tests to match actual AZ naming implementation ([ae2e6c0](https://github.com/gangster/subnetter/commit/ae2e6c038501e81f1cba1276d797993afc80770d))
* update test fixtures with consistent subnet type ordering to avoid CIDR overlaps ([2622a81](https://github.com/gangster/subnetter/commit/2622a81890d50e0a4a112ecbc25046c087367840))


### Features

* add CIDR overlap validation and fix CLI ([8f58309](https://github.com/gangster/subnetter/commit/8f58309b2c748638285426f16ae17553df69e0e7))
* add configuration with 32 regions for each cloud provider ([cd8d9c7](https://github.com/gangster/subnetter/commit/cd8d9c702085632805b0a138a35b2fae134b5118))
* enhance AZ naming for region-specific patterns ([9f361b3](https://github.com/gangster/subnetter/commit/9f361b361fdd2d45752f950c41befcd5c5e921ac))
* group CSV output by cloud provider then account ([4d9d982](https://github.com/gangster/subnetter/commit/4d9d9823775be128cd8a452d9c43486e766c85b0))
* implement hierarchical and contiguous CIDR allocation ([4ceb75a](https://github.com/gangster/subnetter/commit/4ceb75a5497be18bdc1ed9cf52d9e732ae64f4a4))
* restructure three-az-kubernetes config for /16 account CIDRs ([4962fee](https://github.com/gangster/subnetter/commit/4962feea939e259eb0de3e5ccf111f648d115bf8))
* standardize 16 regions per account in config ([e599a61](https://github.com/gangster/subnetter/commit/e599a6142068384636553b287c9acff73633e642))
* standardize on 12 globally distributed regions ([3cdd2af](https://github.com/gangster/subnetter/commit/3cdd2af86cd67b435f71b3716c357ef8db3fa682))
* update base CIDR to start at 10.100.0.0/8 ([82e93d8](https://github.com/gangster/subnetter/commit/82e93d88c0475b861b70a04af93cf2fbf6721938))


### BREAKING CHANGES

* Configurations with overlapping baseCidr values are now rejected

# 1.0.0 (2025-03-17)


### Bug Fixes

* correct API documentation link in homepage ([b03c862](https://github.com/gangster/subnetter/commit/b03c86263d3b8246107fb0ef0446a6b1c5cc54a3))
