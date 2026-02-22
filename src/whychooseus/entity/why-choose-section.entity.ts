import { WhyChooseCardEntity } from './why-choose-card.entity';

export class WhyChooseSectionEntity {
  id!: number;
  header!: string;
  headerHighlight!: string | null;
  subHeader!: string | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  cards?: WhyChooseCardEntity[];
}
