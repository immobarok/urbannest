export class FaqEntity {
  id!: string;
  question!: string;
  answer!: string;
  isActive!: boolean;
  order!: number;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<FaqEntity>) {
    Object.assign(this, partial);
  }
}
