import { HowItWorksStepEntity } from './HowItWorksStep.entity';

export class HowItWorksSectionEntity {
  id!: string;
  title!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  steps?: HowItWorksStepEntity[];

  constructor(partial: Partial<HowItWorksSectionEntity>) {
    Object.assign(this, partial);

    if (partial.steps) {
      this.steps = partial.steps.map((step) => new HowItWorksStepEntity(step));
    }
  }
}
