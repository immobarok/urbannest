export class MediaEntity {
  id!: string;
  uploaderId!: string;
  filename!: string;
  originalName!: string;
  mimeType!: string;
  size!: number;
  bucket!: string;
  url!: string;
  alt!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class MediaListEntity {
  data!: MediaEntity[];
  total!: number;
  page!: number;
  limit!: number;
}

export class BulkDeleteResultEntity {
  deleted!: number;
  message!: string;
}
