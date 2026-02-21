export class HowItWorksStepEntity {
  id!: string;
  title!: string;
  description!: string;
  icon?: string;
  order!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<HowItWorksStepEntity>) {
    Object.assign(this, partial);
  }
}
