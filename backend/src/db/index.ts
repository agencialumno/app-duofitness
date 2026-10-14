// Ponto de extensão para banco de dados (fase 2: Postgres no Neon).
// Nada aqui é usado ainda. Quando entrar o banco, implemente estas interfaces
// (ex: com @neondatabase/serverless) e injete em createApp({ repos }).

export interface UserRecord {
  id: string;
  createdAt: string;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
}

export interface SavedPlanRepository {
  save(userId: string, plan: unknown): Promise<{ id: string }>;
  listByUser(userId: string): Promise<{ id: string; plan: unknown; createdAt: string }[]>;
}

export interface Repositories {
  users: UserRepository;
  plans: SavedPlanRepository;
}
