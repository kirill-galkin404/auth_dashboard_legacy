import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/userRepository';
import { SessionUser } from '../types';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async login(username: string, password: string): Promise<SessionUser | null> {
    const row = await this.userRepository.findByUsername(username);
    if (!row) return null;

    const matches = await bcrypt.compare(password, row.password);
    if (!matches) return null;

    return { id: row.id, username: row.username };
  }
}
