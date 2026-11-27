## DTO Mapping in NestJS with Prisma

- The controller receives the request body as a `CreateDto` via `@Body()` and passes it to the service.
- The service applies the creation rules and builds the Prisma create input from the DTO. Use a `toCreateInput()` mapper when the conversion is complex or reused.
- The service passes the input to `prisma.<model>.create({ data })`, which returns the created record.
- The controller maps the returned record to a response DTO when the API needs a specific response shape.
