export interface IUuidService {
  random(): string;
}

export const random = () => {
  return crypto.randomUUID();
};

export const UuidService: IUuidService = {
  random,
};

