export class WhyChooseCardEntity {
  id!: number;
  title!: string;
  description!: string | null;
  iconUrl!: string | null;
  iconAlt!: string | null;
  sortOrder!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  sectionId!: number;
}
