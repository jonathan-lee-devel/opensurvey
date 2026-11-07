// Suites (https://suites.dev) type augmentation: makes `unitRef.get()` and
// `Mocked<T>` return Vitest mocks and teaches Suites NestJS's DI metadata.
// Only unit specs use it; tsconfig.build.json leaves it out of the build.
/// <reference types="@suites/doubles.vitest/unit" />
/// <reference types="@suites/di.nestjs/metadata" />
