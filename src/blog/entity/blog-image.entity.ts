export class BlogImageEntity {
	id!: number;
	blogId!: number;
	url!: string;
	caption!: string | null;
	createdAt!: Date;

	constructor(partial: Partial<BlogImageEntity>) {
		Object.assign(this, partial);
	}
}
