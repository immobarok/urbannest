import { BlogImageEntity } from "./blog-image.entity";

export class BlogEntity {
	id!: number;
	title!: string;
	content!: string;
	author!: string;
	readTime!: number;
	isPublished!: boolean;
	createdAt!: Date;
	updatedAt!: Date;

	images?: BlogImageEntity[];

	constructor(partial: Partial<BlogEntity>) {
		Object.assign(this, partial);
		if (partial.images) {
			this.images = partial.images.map((img) => new BlogImageEntity(img));
		}
	}
}
