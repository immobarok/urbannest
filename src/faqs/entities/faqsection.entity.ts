import { FaqEntity } from './faq.entity';

export class FaqSectionEntity {
  id!: string;
  title!: string;
  slug!: string;
  isActive!: boolean;
  faqs?: FaqEntity[];
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<FaqSectionEntity>) {
    Object.assign(this, partial);
  }
}
