export class BrandEntity {
  id!: string;
  userId!: string;
  name!: string;
  description!: string | null;
  logoUrl!: string | null;
  websiteUrl!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class BrandListEntity {
  data!: BrandEntity[];
  total!: number;
  page!: number;
  limit!: number;
}
