import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  me(): void {}

  logout(): void {}

  refresh(): void {}
}
